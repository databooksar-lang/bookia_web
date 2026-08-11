import assert from "node:assert/strict";

import { deriveReaderMonogram, hasReaderTraits, normalizeReaderTraits, toggleReaderTrait } from "../src/readerIdentityState.js";

export function registerReaderIdentityStateTests(test) {
  test("derives at most two reader initials with a safe fallback", () => {
    assert.equal(deriveReaderMonogram("Ana Borges"), "AB");
    assert.equal(deriveReaderMonogram("  Úrsula  "), "Ú");
    assert.equal(deriveReaderMonogram(""), "L");
  });

  test("normalizes known trait groups and drops malformed values", () => {
    assert.deepEqual(
      normalizeReaderTraits({ how_i_read: ["daily_ritual", 3], what_i_seek: "invalid", book_relationship: ["love_recommending"] }),
      { how_i_read: ["daily_ritual"], what_i_seek: [], book_relationship: ["love_recommending"] },
    );
  });

  test("toggles a trait without mutating and enforces two choices per group", () => {
    const traits = { how_i_read: ["daily_ritual", "take_notes"], what_i_seek: [], book_relationship: [] };
    assert.deepEqual(toggleReaderTrait(traits, "how_i_read", "follow_mood"), traits);
    assert.deepEqual(toggleReaderTrait(traits, "how_i_read", "daily_ritual"), { ...traits, how_i_read: ["take_notes"] });
    assert.deepEqual(traits.how_i_read, ["daily_ritual", "take_notes"]);
  });

  test("detects whether a public passport has any declared traits", () => {
    assert.equal(hasReaderTraits({ how_i_read: [], what_i_seek: [], book_relationship: [] }), false);
    assert.equal(hasReaderTraits({ how_i_read: [], what_i_seek: ["companionship"], book_relationship: [] }), true);
  });
}
