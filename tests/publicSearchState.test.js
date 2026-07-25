import assert from "node:assert/strict";

import { buildPublicSearchParams } from "../src/publicSearchState.js";
import * as publicSearchState from "../src/publicSearchState.js";

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
  const bookstores = [
    { id: 1, name: "Librer\u00EDa \u00C1lamo", tag_1: "Generalista", tag_2: "Usados" },
    { id: 2, name: "Infantil Sur", tag_1: "Infantil", tag_2: "generalista" },
    { id: 3, name: "Poes\u00EDa Norte", tag_1: "Poes\u00EDa", tag_2: "" },
  ];
  const getBookstoreTags = publicSearchState.getBookstoreTags || (() => null);
  const filterBookstores = publicSearchState.filterBookstores || (() => null);

  register("derives each bookstore tag once for the filter", () => {
    assert.deepEqual(getBookstoreTags(bookstores), ["Generalista", "Infantil", "Poes\u00EDa", "Usados"]);
  });

  register("finds bookstores by name without case or accent sensitivity", () => {
    assert.deepEqual(filterBookstores(bookstores, { query: "alamo", tag: "" }).map((bookstore) => bookstore.id), [1]);
  });

  register("finds bookstores by either assigned tag", () => {
    assert.deepEqual(filterBookstores(bookstores, { query: "", tag: "generalista" }).map((bookstore) => bookstore.id), [1, 2]);
  });

  register("applies the name and tag filters together", () => {
    assert.deepEqual(filterBookstores(bookstores, { query: "sur", tag: "generalista" }).map((bookstore) => bookstore.id), [2]);
  });

  register("returns no bookstores when no filter combination matches", () => {
    assert.deepEqual(filterBookstores(bookstores, { query: "sur", tag: "Poes\u00EDa" }), []);
  });

  register("builds the reading-club genre query", () => {
    assert.deepEqual(
      [...publicSearchState.buildReadingClubSearchParams("policial").entries()],
      [["genre_slug", "policial"]],
    );
  });

  register("limits the unfiltered reading-club list and keeps all filtered matches", () => {
    const clubs = Array.from({ length: 7 }, (_, index) => ({ id: index + 1 }));

    assert.deepEqual(
      publicSearchState.getVisibleReadingClubs(clubs, "").map((club) => club.id),
      [1, 2, 3, 4, 5, 6],
    );
    assert.deepEqual(
      publicSearchState.getVisibleReadingClubs(clubs, "policial").map((club) => club.id),
      [1, 2, 3, 4, 5, 6, 7],
    );
  });
}
