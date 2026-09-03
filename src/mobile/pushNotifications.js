import { PushNotifications } from "@capacitor/push-notifications";

import { apiFetch } from "../api.js";
import { isNativeAndroidRuntime } from "./sessionVault.js";

const ALLOWED_PATHS = [/^\/$/, /^\/profile$/, /^\/dashboard$/, /^\/bookstores\/[a-z0-9-]+$/, /^\/readers\/[a-z0-9-]+$/];

export function resolvePushNotificationRoute(value) {
  const raw = String(value || "").trim();
  if (!raw.startsWith("/") || raw.startsWith("//") || raw.includes("\\") || raw.includes("..") || /%2f|%5c/i.test(raw)) return null;
  try {
    const parsed = new URL(raw, "https://mybookia.app");
    if (parsed.origin !== "https://mybookia.app" || parsed.hash || parsed.pathname.includes("..")) return null;
    if (!ALLOWED_PATHS.some((pattern) => pattern.test(parsed.pathname))) return null;
    return `${parsed.pathname}${parsed.search}`;
  } catch {
    return null;
  }
}

export function createPushNotificationsController({ nativeAndroid, plugin, apiFetch: fetchApi, navigate: navigateTo }) {
  let currentToken = null;
  let listenersPromise = null;
  let registrationWaiters = [];

  function settleRegistration(error, token = null) {
    const waiters = registrationWaiters;
    registrationWaiters = [];
    waiters.forEach(({ resolve, reject }) => error ? reject(error) : resolve(token));
  }

  async function listen() {
    if (!nativeAndroid) return;
    if (!listenersPromise) {
      listenersPromise = Promise.all([
        plugin.addListener("registration", ({ value }) => {
          currentToken = String(value || "").trim() || null;
          if (currentToken) settleRegistration(null, currentToken);
          else settleRegistration(new Error("Android no devolvió un token de notificaciones."));
        }),
        plugin.addListener("registrationError", () => settleRegistration(new Error("Android no pudo registrar las notificaciones."))),
        plugin.addListener("pushNotificationReceived", () => {}),
        plugin.addListener("pushNotificationActionPerformed", (event) => {
          const route = resolvePushNotificationRoute(event?.notification?.data?.route);
          if (route) navigateTo(route);
        }),
      ]);
    }
    await listenersPromise;
  }

  async function requestRegistrationToken() {
    await listen();
    const tokenPromise = new Promise((resolve, reject) => registrationWaiters.push({ resolve, reject }));
    await plugin.register();
    return tokenPromise;
  }

  return {
    listen,
    async permissionStatus() {
      if (!nativeAndroid) return "unavailable";
      return (await plugin.checkPermissions()).receive;
    },
    async initialize() {
      if (!nativeAndroid) return { status: "unavailable" };
      let permission = await plugin.checkPermissions();
      if (permission.receive !== "granted") permission = await plugin.requestPermissions();
      if (permission.receive !== "granted") return { status: "denied" };
      const token = await requestRegistrationToken();
      await fetchApi("/mobile/push/devices", { method: "POST", body: JSON.stringify({ token, platform: "android" }) });
      return { status: "enabled" };
    },
    async disable() {
      if (!nativeAndroid || !currentToken) return { status: "disabled" };
      await fetchApi("/mobile/push/devices/current", { method: "DELETE", body: JSON.stringify({ token: currentToken }) });
      currentToken = null;
      return { status: "disabled" };
    },
  };
}

export const pushNotificationsController = createPushNotificationsController({
  nativeAndroid: isNativeAndroidRuntime(),
  plugin: PushNotifications,
  apiFetch,
  navigate: (route) => import("../navigation.jsx").then(({ navigate }) => navigate(route)),
});
