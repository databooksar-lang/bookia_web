import assert from "node:assert/strict";

import { createPushNotificationsController, resolvePushNotificationRoute } from "../src/mobile/pushNotifications.js";


function createPlugin({ permission = "granted", token = "fcm-token" } = {}) {
  const listeners = new Map();
  return {
    registerCalls: 0,
    async checkPermissions() { return { receive: permission }; },
    async requestPermissions() { return { receive: permission }; },
    async addListener(name, listener) { listeners.set(name, listener); return { remove() {} }; },
    async register() {
      this.registerCalls += 1;
      queueMicrotask(() => listeners.get("registration")?.({ value: token }));
    },
    emit(name, payload) { listeners.get(name)?.(payload); },
  };
}


export function registerMobilePushNotificationsTests(test) {
  test("does not register a device when Android notification permission is denied", async () => {
    const plugin = createPlugin({ permission: "denied" });
    const calls = [];
    const controller = createPushNotificationsController({ nativeAndroid: true, plugin, apiFetch: async (...args) => calls.push(args), navigate: () => {} });

    assert.deepEqual(await controller.initialize(), { status: "denied" });
    assert.equal(plugin.registerCalls, 0);
    assert.deepEqual(calls, []);
  });

  test("registers the granted FCM token through the Android bearer API", async () => {
    const plugin = createPlugin();
    const calls = [];
    const controller = createPushNotificationsController({
      nativeAndroid: true,
      plugin,
      apiFetch: async (...args) => { calls.push(args); return { enabled: true }; },
      navigate: () => {},
    });

    assert.deepEqual(await controller.initialize(), { status: "enabled" });
    assert.deepEqual(calls, [["/mobile/push/devices", {
      method: "POST",
      body: JSON.stringify({ token: "fcm-token", platform: "android" }),
    }]]);
  });

  test("navigates only to allowlisted internal notification routes", async () => {
    const plugin = createPlugin();
    const visited = [];
    const controller = createPushNotificationsController({ nativeAndroid: true, plugin, apiFetch: async () => ({ enabled: true }), navigate: (route) => visited.push(route) });
    await controller.listen();

    plugin.emit("pushNotificationActionPerformed", { notification: { data: { route: "https://evil.example/profile" } } });
    plugin.emit("pushNotificationActionPerformed", { notification: { data: { route: "/profile?section=favorites" } } });

    assert.deepEqual(visited, ["/profile?section=favorites"]);
    assert.equal(resolvePushNotificationRoute("//evil.example/profile"), null);
  });
}
