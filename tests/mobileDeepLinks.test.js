import assert from "node:assert/strict";

import { installBookiaDeepLinkListener, resolveBookiaDeepLink } from "../src/mobile/deepLinks.js";


export function registerMobileDeepLinksTests(test) {
  test("accepts Bookia HTTPS app links and preserves safe queries", () => {
    assert.equal(resolveBookiaDeepLink("https://mybookia.app/bookstores/eterna"), "/bookstores/eterna");
    assert.equal(resolveBookiaDeepLink("https://www.mybookia.app/profile?section=favorites"), "/profile?section=favorites");
  });

  test("rejects hostile hosts, schemes, traversal and unsupported routes", () => {
    assert.equal(resolveBookiaDeepLink("https://evil.example/bookstores/eterna"), null);
    assert.equal(resolveBookiaDeepLink("http://mybookia.app/profile"), null);
    assert.equal(resolveBookiaDeepLink("https://mybookia.app/profile/../dashboard"), null);
    assert.equal(resolveBookiaDeepLink("https://mybookia.app//profile"), null);
    assert.equal(resolveBookiaDeepLink("https://mybookia.app/admin"), null);
  });

  test("navigates only after a native app link passes validation", async () => {
    let listener;
    const visited = [];
    const handle = await installBookiaDeepLinkListener({ nativeAndroid: true, appPlugin: { addListener: async (_, next) => { listener = next; return { remove() {} }; } }, navigate: (route) => visited.push(route) });

    listener({ url: "https://evil.example/profile" });
    listener({ url: "https://mybookia.app/readers/ana" });
    await handle.remove();

    assert.deepEqual(visited, ["/readers/ana"]);
  });
}
