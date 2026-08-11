import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { buildReaderProfilePayload, createReaderProfileDraft, favoriteGenreSelectionLabel, getReaderFavoriteGenresState, loadReaderFavorites, normalizeReaderFavoriteGenres, normalizeReaderFavorites, normalizeReaderFollowedBookstores, toggleReaderFavoriteGenre } from "../src/readerProfileState.js";

export function registerReaderProfileStateTests(test) {
  test("defaults a reader profile to public only when visibility is missing", () => {
    assert.equal(createReaderProfileDraft({}).is_public, true);
    assert.equal(createReaderProfileDraft({ is_public: false }).is_public, false);
  });

  test("creates a reader profile draft with selected favorite genre ids", () => {
    assert.deepEqual(
      createReaderProfileDraft({ favorite_genres: [{ id: 3, name: "Poesia" }, { id: 9, name: "Fantasia" }] }),
      { display_name: "", slug: "", description: "", is_public: true, favorite_genre_ids: [3, 9] },
    );
  });

  test("builds reader profile payloads with empty and selected favorite genres", () => {
    const baseDraft = { display_name: "Ana", slug: "ana-lee", description: "Leo", is_public: true };

    assert.deepEqual(buildReaderProfilePayload({ ...baseDraft, favorite_genre_ids: [] }), { ...baseDraft, favorite_genre_ids: [] });
    assert.deepEqual(buildReaderProfilePayload({ ...baseDraft, favorite_genre_ids: [3, 9] }), { ...baseDraft, favorite_genre_ids: [3, 9] });
  });
  test("labels zero and multiple favorite genre selections", () => {
    assert.equal(favoriteGenreSelectionLabel([]), "0 generos seleccionados");
    assert.equal(favoriteGenreSelectionLabel([3, 9]), "2 generos seleccionados");
  });
  test("normalizes the genres endpoint items for favorite genre selection", () => {
    assert.deepEqual(
      normalizeReaderFavoriteGenres({ items: [{ id: 3, name: "Poesia", slug: "poesia" }] }),
      [{ id: 3, name: "Poesia", slug: "poesia" }],
    );
    assert.deepEqual(normalizeReaderFavoriteGenres({ genres: [{ id: 9 }] }), []);
  });
  test("toggles a favorite genre id without mutating the current selection", () => {
    const selected = [3, 9];

    assert.deepEqual(toggleReaderFavoriteGenre(selected, 7), [3, 9, 7]);
    assert.deepEqual(toggleReaderFavoriteGenre(selected, 3), [9]);
    assert.deepEqual(selected, [3, 9]);
  });

  test("reports genre loading and request errors without blocking profile editing", () => {
    assert.deepEqual(getReaderFavoriteGenresState({ loading: true, error: "", genres: [] }), { kind: "loading", message: "Cargando generos..." });
    assert.deepEqual(getReaderFavoriteGenresState({ loading: false, error: "No pudimos cargar los generos.", genres: [] }), { kind: "error", message: "No pudimos cargar los generos." });
  });
  test("renders a favorite-genre dropdown in reader profile editing and tags on public profiles", () => {
    const profilePage = readFileSync(new URL("../src/pages/ReaderProfilePage.jsx", import.meta.url), "utf8");
    const publicPages = readFileSync(new URL("../src/pages/PublicPages.jsx", import.meta.url), "utf8");
    const privacyPage = readFileSync(new URL("../src/pages/PrivacyPage.jsx", import.meta.url), "utf8");
    const termsPage = readFileSync(new URL("../src/pages/TermsPage.jsx", import.meta.url), "utf8");

    assert.match(profilePage, /apiFetch\("\/genres"\)/);
    assert.doesNotMatch(profilePage, /apiFetch\("\/auth\/logout"/);
    assert.doesNotMatch(profilePage, /Cerrar sesion/);
assert.match(profilePage, /<fieldset className="bookstore-profile-field-wide reader-favorite-genres-field">/);
    assert.match(profilePage, /<legend>.*te gustan<\/legend>/);
    assert.match(profilePage, /<details className="reader-favorite-genres"/);
    assert.match(profilePage, /className={`reader-favorite-genre-chip/);
    assert.match(profilePage, /className="reader-favorite-genre-checkbox"/);
    assert.match(profilePage, /type="checkbox"/);
    assert.match(profilePage, /favoriteGenreSelectionLabel\(draft\.favorite_genre_ids\)/);
    assert.doesNotMatch(profilePage, /body: JSON\.stringify\(draft\)/);
    assert.match(profilePage, /favoriteGenreIdsKey/);
    assert.match(publicPages, /reader\.favorite_genres\?\.length/);
    assert.match(publicPages, /aria-label="Generos favoritos"/);
    assert.match(privacyPage, /generos de lectura seleccionados/);
    assert.match(termsPage, /generos de lectura que seleccione/);
  });
  test("uses the shared rich description editor in the reader profile and safely renders it publicly", () => {
    const profilePage = readFileSync(new URL("../src/pages/ReaderProfilePage.jsx", import.meta.url), "utf8");
    const publicPages = readFileSync(new URL("../src/pages/PublicPages.jsx", import.meta.url), "utf8");

    assert.match(profilePage, /import\s*\{\s*RichDescriptionEditor\s*\}\s*from\s*["']\.\.\/components\/RichDescriptionEditor["']/);
    assert.match(profilePage, /<RichDescriptionEditor\b[^>]*\bvalue=\{draft\.description\}[^>]*\bonChange=/s);
    assert.match(profilePage, /maxLength=\{5000\}/);
    assert.match(publicPages, /<BookstoreDescription value=\{reader\.description \|\| "Comparte clubes de lectura con la comunidad Bookia\."\}/);
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

  test("drops incomplete favorite entries instead of rendering blank book rows", () => {
    assert.deepEqual(
      normalizeReaderFavorites({ books: [{ id: 7, title: "Ficciones", author: "Borges" }, { id: 8, catalog_item_id: 4 }] }),
      [{ id: 7, title: "Ficciones", author: "Borges" }],
    );
  });

  test("normalizes followed bookstores from the favorites dashboard contract", () => {
    assert.deepEqual(normalizeReaderFollowedBookstores({ bookstores: [
      { id: 4, name: "Eterna Cadencia", slug: "eterna", logo_url: "/logo.webp", address: "Honduras 5574" },
      { id: 0, name: "Inválida", slug: "invalida" },
      { id: 8, name: "", slug: "sin-nombre" },
    ] }), [{ id: 4, name: "Eterna Cadencia", slug: "eterna", logo_url: "/logo.webp", address: "Honduras 5574" }]);
  });

  test("turns inactive followed bookstores into safe tombstones", () => {
    assert.deepEqual(normalizeReaderFollowedBookstores({ bookstores: [{
      id: 12,
      name: "Librería cerrada",
      slug: "cerrada",
      logo_url: "https://cdn.example/logo.png",
      address: "Dirección privada",
      is_active: false,
    }] }), [{ id: 12, name: "Librería cerrada", slug: "", logo_url: "", address: "", is_active: false }]);
  });
}

