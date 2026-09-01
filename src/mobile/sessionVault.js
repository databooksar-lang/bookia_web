import { Capacitor } from "@capacitor/core";
import { TokenVault } from "capacitor-token-vault";

export function isNativeAndroidRuntime() {
  return Capacitor.isNativePlatform() && Capacitor.getPlatform() === "android";
}

export function createSessionVault({ nativeAndroid, tokenVault }) {
  return {
    async get() {
      if (!nativeAndroid) return null;
      const { value } = await tokenVault.getToken();
      return value || null;
    },
    async set(token) {
      if (!nativeAndroid) return;
      if (!token) throw new Error("No se puede guardar una sesión móvil vacía.");
      await tokenVault.setToken({ value: token });
    },
    async clear() {
      if (!nativeAndroid) return;
      await tokenVault.clear();
    },
  };
}

export function buildMobileSessionHeaders({ nativeAndroid, token }) {
  if (!nativeAndroid) return {};
  return {
    "X-Bookia-Client": "android",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export function createMobileSessionTransport({ nativeAndroid, sessionVault }) {
  return {
    async getRequestHeaders() {
      const token = nativeAndroid ? await sessionVault.get() : null;
      return buildMobileSessionHeaders({ nativeAndroid, token });
    },
    async acceptResponse(payload) {
      if (nativeAndroid && payload?.mobile_session_token) {
        await sessionVault.set(payload.mobile_session_token);
        const { mobile_session_token: _, ...safePayload } = payload;
        return safePayload;
      }
      return payload;
    },
    async clear() {
      await sessionVault.clear();
    },
  };
}

const runtimeVault = createSessionVault({
  nativeAndroid: isNativeAndroidRuntime(),
  tokenVault: TokenVault,
});
export const mobileSessionTransport = createMobileSessionTransport({
  nativeAndroid: isNativeAndroidRuntime(),
  sessionVault: runtimeVault,
});

export function getMobileSessionToken() {
  return runtimeVault.get();
}

export function setMobileSessionToken(token) {
  return runtimeVault.set(token);
}

export function clearMobileSessionToken() {
  return runtimeVault.clear();
}
