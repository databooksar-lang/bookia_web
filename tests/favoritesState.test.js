import assert from "node:assert/strict";

import { createFavoriteBookIds, isReaderAccount, toggleFavoriteBookId } from "../src/favoritesState.js";

export function registerFavoritesStateTests(test) {
  test("creates favorite ids from the reader favorites response", () => {
    assert.deepEqual([...createFavoriteBookIds({ books: [{ id: 9 }, { id: 4 }] })], [9, 4]);
    assert.deepEqual([...createFavoriteBookIds({})], []);
  });

  test("toggles only the selected favorite book id", () => {
    const saved = toggleFavoriteBookId(new Set([4, 9]), 12, true);
    assert.deepEqual([...saved], [4, 9, 12]);

    const removed = toggleFavoriteBookId(saved, 9, false);
    assert.deepEqual([...removed], [4, 12]);
  });

  test("recognizes reader accounts independently of bookstore roles", () => {
    assert.equal(isReaderAccount({ reader_profile: { slug: "ana-lee" }, roles: ["reader"] }), true);
    assert.equal(isReaderAccount({ roles: ["bookstore_owner"] }), false);
    assert.equal(isReaderAccount(null), false);
  });
}
