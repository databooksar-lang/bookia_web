import assert from "node:assert/strict";

import { buildPublicSearchParams } from "../src/publicSearchState.js";
import * as publicSearchState from "../src/publicSearchState.js";

export function registerPublicSearchStateTests(register) {
  register("builds one general query for title, author, or publisher searches", () => {
    assert.deepEqual(
      [...buildPublicSearchParams({ query: "Julio Cortázar" }).entries()],
      [["query", "Julio Cortázar"]],
    );
  });

  register("builds public search parameters with the selected book status", () => {
    assert.deepEqual(
      [...buildPublicSearchParams({
        title: "Rayuela",
        author: "Cortazar",
        bookStatus: "nuevo",
        language: "es",
        genreSlug: "policial",
      }).entries()],
      [
        ["title", "Rayuela"],
        ["author", "Cortazar"],
        ["book_status", "nuevo"],
        ["language", "es"],
        ["genre_slug", "policial"],
      ],
    );
  });

  register("omits empty public search filters", () => {
    assert.deepEqual(
      [...buildPublicSearchParams({ title: "  ", author: "", bookStatus: "", language: undefined, genreSlug: "" }).entries()],
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
  const selectDiscoveryCarouselItems = publicSearchState.selectDiscoveryCarouselItems || (() => []);
  const getDiscoveryCarouselScrollOptions = publicSearchState.getDiscoveryCarouselScrollOptions || (() => ({}));
  const getDiscoveryCarouselNavigation = publicSearchState.getDiscoveryCarouselNavigation || (() => ({}));

  register("selects recent carousel books from distinct bookstores before filling remaining slots", () => {
    const items = [
      { id: 1, bookstore: { id: 10 } },
      { id: 2, bookstore: { id: 10 } },
      { id: 3, bookstore: { id: 20 } },
      { id: 4, bookstore: { id: 20 } },
      { id: 5, bookstore: { id: 30 } },
    ];

    assert.deepEqual(
      selectDiscoveryCarouselItems(items, 4).map((item) => item.id),
      [1, 3, 5, 2],
    );
  });

  register("deduplicates carousel books and never exceeds its requested limit", () => {
    const items = [
      { id: 1, bookstore: { id: 10 } },
      { id: 1, bookstore: { id: 10 } },
      { id: 2, bookstore: { id: 10 } },
      { id: 3, bookstore: { id: 20 } },
      { id: 4, bookstore: { id: 30 } },
    ];

    assert.deepEqual(
      selectDiscoveryCarouselItems(items, 3).map((item) => item.id),
      [1, 3, 4],
    );
    assert.deepEqual(selectDiscoveryCarouselItems(items, 0), []);
  });

  register("builds bounded carousel scrolling for direction and reduced-motion preferences", () => {
    assert.deepEqual(
      getDiscoveryCarouselScrollOptions({ direction: 1, clientWidth: 1000, reduceMotion: false }),
      { left: 720, behavior: "smooth" },
    );
    assert.deepEqual(
      getDiscoveryCarouselScrollOptions({ direction: -1, clientWidth: 400, reduceMotion: true }),
      { left: -340, behavior: "auto" },
    );
  });

  register("disables carousel controls at scroll boundaries with snap-padding tolerance", () => {
    assert.deepEqual(
      getDiscoveryCarouselNavigation({ scrollLeft: 3, scrollWidth: 2029, clientWidth: 371 }),
      { canPrevious: false, canNext: true },
    );
    assert.deepEqual(
      getDiscoveryCarouselNavigation({ scrollLeft: 1656, scrollWidth: 2029, clientWidth: 371 }),
      { canPrevious: true, canNext: false },
    );
    assert.deepEqual(
      getDiscoveryCarouselNavigation({ scrollLeft: 0, scrollWidth: 300, clientWidth: 300 }),
      { canPrevious: false, canNext: false },
    );
  });

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

  register("filters reading clubs by title without case or accent sensitivity", () => {
    const clubs = [
      { id: 1, title: "C\u00EDrculo de poes\u00EDa" },
      { id: 2, title: "Misterio nocturno" },
    ];

    assert.deepEqual(
      publicSearchState.getVisibleReadingClubs(clubs, "policial", "circulo").map((club) => club.id),
      [1],
    );
  });

  register("keeps all matching clubs when filtering by title", () => {
    const clubs = Array.from({ length: 7 }, (_, index) => ({ id: index + 1, title: "Club mensual" }));

    assert.deepEqual(
      publicSearchState.getVisibleReadingClubs(clubs, "", "club").map((club) => club.id),
      [1, 2, 3, 4, 5, 6, 7],
    );
  });

  register("finds reading clubs by title or description without case or accent sensitivity", () => {
    const clubs = [
      { id: 1, title: "Círculo de narrativa", description: "Leemos ciencia ficción contemporánea." },
      { id: 2, title: "Lecturas del mes", description: "Un encuentro de poesía latinoamericana." },
      { id: 3, title: "Novela histórica", description: "Conversamos sobre clásicos." },
    ];

    assert.deepEqual(
      publicSearchState.getVisibleReadingClubs(clubs, "", "POESIA").map((club) => club.id),
      [2],
    );
    assert.deepEqual(
      publicSearchState.getVisibleReadingClubs(clubs, "", "circulo").map((club) => club.id),
      [1],
    );
  });

  register("shows all unfiltered reading clubs when the preview is expanded", () => {
    const clubs = Array.from({ length: 7 }, (_, index) => ({ id: index + 1 }));

    assert.deepEqual(
      publicSearchState.getVisibleReadingClubs(clubs, "", "", true).map((club) => club.id),
      [1, 2, 3, 4, 5, 6, 7],
    );
  });

  register("keeps only genres that are available in public reading clubs", () => {
    assert.deepEqual(
      publicSearchState.getAvailableReadingClubGenres([
        { id: 1, slug: "policial", name: "Policial" },
        { id: 2, slug: "terror", name: "Terror" },
        { id: 3, slug: "poesia", name: "Poesia" },
      ], [
        { genre: { slug: "poesia" } },
        { genre: { slug: "policial" } },
        { genre: { slug: "poesia" } },
      ]),
      [
        { id: 1, slug: "policial", name: "Policial" },
        { id: 3, slug: "poesia", name: "Poesia" },
      ],
    );
  });

  register("builds a Google Maps search URL from a bookstore address", () => {
    assert.equal(
      publicSearchState.buildGoogleMapsAddressUrl("Av. Corrientes 1234, CABA"),
      "https://www.google.com/maps/search/?api=1&query=Av.%20Corrientes%201234%2C%20CABA",
    );
  });

  register("encodes accents and special characters in a Google Maps address URL", () => {
    assert.equal(
      publicSearchState.buildGoogleMapsAddressUrl("Córdoba & Suárez 45"),
      "https://www.google.com/maps/search/?api=1&query=C%C3%B3rdoba%20%26%20Su%C3%A1rez%2045",
    );
  });

  register("does not build a Google Maps URL for an empty bookstore address", () => {
    assert.equal(publicSearchState.buildGoogleMapsAddressUrl("  "), "");
    assert.equal(publicSearchState.buildGoogleMapsAddressUrl(undefined), "");
  });

}
