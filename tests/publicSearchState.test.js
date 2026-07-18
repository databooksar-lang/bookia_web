import assert from "node:assert/strict";

import { buildPublicSearchParams } from "../src/publicSearchState.js";

export function registerPublicSearchStateTests(register) {
  register("builds public search parameters from every populated filter", () => {
    assert.deepEqual(
      [...buildPublicSearchParams({
        title: "Rayuela",
        author: "Cortazar",
        publisher: "Sudamericana",
        language: "es",
        genreSlug: "policial",
      }).entries()],
      [
        ["title", "Rayuela"],
        ["author", "Cortazar"],
        ["publisher", "Sudamericana"],
        ["language", "es"],
        ["genre_slug", "policial"],
      ],
    );
  });

  register("omits empty public search filters", () => {
    assert.deepEqual(
      [...buildPublicSearchParams({ title: "  ", author: "", publisher: null, language: undefined, genreSlug: "" }).entries()],
      [],
    );
  });
}
