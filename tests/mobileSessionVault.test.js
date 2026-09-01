import assert from "node:assert/strict";

import { buildMobileSessionHeaders, createMobileSessionTransport, createSessionVault } from "../src/mobile/sessionVault.js";

export function registerMobileSessionVaultTests(test) {
  test("persists and clears the Android session through the secure vault", async () => {
    let storedToken = null;
    const vault = createSessionVault({
      nativeAndroid: true,
      tokenVault: {
        async setToken({ value }) { storedToken = value; },
        async getToken() { return { value: storedToken }; },
        async clear() { storedToken = null; },
      },
    });

    await vault.set("mobile-session");
    assert.equal(await vault.get(), "mobile-session");
    await vault.clear();
    assert.equal(await vault.get(), null);
  });

  test("never persists a mobile token in the web runtime", async () => {
    let called = false;
    const vault = createSessionVault({
      nativeAndroid: false,
      tokenVault: {
        async setToken() { called = true; },
        async getToken() { called = true; return { value: "unexpected" }; },
        async clear() { called = true; },
      },
    });

    await vault.set("secret");
    assert.equal(await vault.get(), null);
    await vault.clear();
    assert.equal(called, false);
  });

  test("adds the Android client and bearer headers only to native requests", () => {
    assert.deepEqual(buildMobileSessionHeaders({ nativeAndroid: true, token: "secret" }), {
      "X-Bookia-Client": "android",
      Authorization: "Bearer secret",
    });
    assert.deepEqual(buildMobileSessionHeaders({ nativeAndroid: true, token: null }), {
      "X-Bookia-Client": "android",
    });
    assert.deepEqual(buildMobileSessionHeaders({ nativeAndroid: false, token: "secret" }), {});
  });

  test("promotes a mobile login response into authenticated request headers", async () => {
    let token = null;
    const transport = createMobileSessionTransport({
      nativeAndroid: true,
      sessionVault: {
        async get() { return token; },
        async set(nextToken) { token = nextToken; },
        async clear() { token = null; },
      },
    });

    assert.deepEqual(await transport.getRequestHeaders(), { "X-Bookia-Client": "android" });
    const safePayload = await transport.acceptResponse({ mobile_session_token: "new-session", account: { role: "reader" } });
    assert.deepEqual(safePayload, { account: { role: "reader" } });
    assert.deepEqual(await transport.getRequestHeaders(), {
      "X-Bookia-Client": "android",
      Authorization: "Bearer new-session",
    });
    await transport.clear();
    assert.deepEqual(await transport.getRequestHeaders(), { "X-Bookia-Client": "android" });
  });
}
