import assert from "node:assert/strict";

import { createReaderProfileDraft, loadReaderFavorites } from "../src/readerProfileState.js";

export function registerReaderProfileStateTests(test) {
  test("defaults a reader profile to public only when visibility is missing", () => {
    assert.equal(createReaderProfileDraft({}).is_public, true);
    assert.equal(createReaderProfileDraft({ is_public: false }).is_public, false);
  });

  test("stops a pending favorites load after its cleanup runs", async () => {
    let resolveFavorites;
    const receivedFavorites = [];
    const cleanup = loadReaderFavorites({
      fetchFavorites: () => new Promise((resolve) => { resolveFavorites = resolve; }),
      onFavorites: (books) => receivedFavorites.push(books),
      onError: () => assert.fail("The request should not fail"),
      onSettled: () => assert.fail("The request should not settle after cleanup"),
    });

    assert.equal(typeof cleanup, "function");
    cleanup();
    resolveFavorites({ books: [{ id: 1, title: "Ficciones" }] });
    await new Promise((resolve) => setTimeout(resolve, 0));

    assert.deepEqual(receivedFavorites, []);
  });

  test("delivers favorites and settles while the profile page remains mounted", async () => {
    const receivedFavorites = [];
    let settled = 0;
    loadReaderFavorites({
      fetchFavorites: async () => ({ books: [{ id: 1, title: "Ficciones" }] }),
      onFavorites: (books) => receivedFavorites.push(books),
      onError: () => assert.fail("The request should not fail"),
      onSettled: () => { settled += 1; },
    });
    await new Promise((resolve) => setTimeout(resolve, 0));

    assert.deepEqual(receivedFavorites, [[{ id: 1, title: "Ficciones" }]]);
    assert.equal(settled, 1);
  });
}

