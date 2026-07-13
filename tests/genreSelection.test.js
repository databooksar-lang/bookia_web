import test from "node:test";
import assert from "node:assert/strict";

import { buildSingleGenreIds, getSingleGenreValue } from "../src/genreSelection.js";

test("returns the first selected genre id for single-select fields", () => {
  assert.equal(getSingleGenreValue([8, 3]), 8);
});

test("returns an empty value when no genre is selected", () => {
  assert.equal(getSingleGenreValue([]), "");
  assert.equal(getSingleGenreValue(undefined), "");
});

test("builds an empty genre_ids array when the selection is cleared", () => {
  assert.deepEqual(buildSingleGenreIds(""), []);
});

test("builds a single-item genre_ids array from the selected option", () => {
  assert.deepEqual(buildSingleGenreIds("12"), [12]);
});
