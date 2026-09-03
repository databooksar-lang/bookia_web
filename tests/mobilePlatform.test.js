import assert from "node:assert/strict";

import { createMobilePlatform } from "../src/mobile/platform.js";

export function registerMobilePlatformTests(test) {
  test("uses Bookia's production API when an Android build has no injected configuration", () => {
    const platform = createMobilePlatform({ native: true, platform: "android", apiBaseUrl: "" });

    assert.equal(platform.getApiBase(), "https://bookia-api-production.up.railway.app");
  });

  test("uses an explicit HTTPS API for the native Android app", () => {
    const platform = createMobilePlatform({
      native: true,
      platform: "android",
      apiBaseUrl: "https://bookia-api-production.up.railway.app/",
    });

    assert.equal(platform.isNativeAndroid(), true);
    assert.equal(platform.getApiBase(), "https://bookia-api-production.up.railway.app");
  });

  test("keeps the same-origin API proxy for the web", () => {
    const platform = createMobilePlatform({ native: false, platform: "web", apiBaseUrl: "" });

    assert.equal(platform.isNativeAndroid(), false);
    assert.equal(platform.getApiBase(), "/api");
  });

  test("rejects an insecure native API origin", () => {
    assert.throws(
      () => createMobilePlatform({ native: true, platform: "android", apiBaseUrl: "http://api.example.com" }),
      /HTTPS/,
    );
  });
}
