import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { isBookiaApiRoute } from "../src/apiRoutes.js";
import { resolveApiUrl } from "../src/api.js";
import { buildSingleGenreIds, getSingleGenreValue } from "../src/genreSelection.js";
import { getGenreSelectorState } from "../src/genreSelectorState.js";
import { registerProfileEditorStateTests } from "./profileEditorState.test.js";
import { registerReadingClubStateTests } from "./readingClubState.test.js";
import { registerAiAutocompleteStateTests } from "./aiAutocompleteState.test.js";
import { registerDashboardCatalogStateTests } from "./dashboardCatalogState.test.js";
import { registerPublicSearchStateTests } from "./publicSearchState.test.js";

const tests = [
  ["treats /genres as an API route", () => {
    assert.equal(isBookiaApiRoute("/genres"), true);
    assert.equal(isBookiaApiRoute("/genres?active=true"), true);
  }],
  ["keeps non-api frontend routes out of API detection", () => {
    assert.equal(isBookiaApiRoute("/dashboard"), false);
    assert.equal(isBookiaApiRoute("/bookstores/eterna-cadencia"), false);
    assert.equal(isBookiaApiRoute("/plans"), false);
  }],
  ["resolves same-origin API calls through the /api proxy by default", () => {
    assert.equal(resolveApiUrl("/me"), "/api/me");
    assert.equal(resolveApiUrl("/bookstores/eterna-cadencia"), "/api/bookstores/eterna-cadencia");
    assert.equal(resolveApiUrl("/catalog/12/cover"), "/api/catalog/12/cover");
  }],
  ["does not duplicate the /api prefix for already-prefixed paths", () => {
    assert.equal(resolveApiUrl("/api/me"), "/api/me");
  }],
  ["generates a same-origin Caddy proxy when BOOKIA_API_UPSTREAM_URL is configured", () => {
    const entrypoint = readFileSync(new URL("../docker-entrypoint.sh", import.meta.url), "utf8");
    assert.match(entrypoint, /if \[ -n "\$\{BOOKIA_API_UPSTREAM_URL:-\}" \]/);
    assert.match(entrypoint, /uri strip_prefix \/api/);
    assert.match(entrypoint, /reverse_proxy \$\{BOOKIA_API_UPSTREAM_URL\}/);
    assert.match(entrypoint, /api_base_url="\/api"/);
  }],
  ["returns a JSON deployment error for /api when the Caddy proxy is missing", () => {
    const entrypoint = readFileSync(new URL("../docker-entrypoint.sh", import.meta.url), "utf8");
    assert.match(entrypoint, /header Content-Type application\/json/);
    assert.match(entrypoint, /BOOKIA_API_UPSTREAM_URL no esta configurada/);
    assert.match(entrypoint, /respond .* 503/);
  }],
  ["returns loading state while genres are being fetched", () => {
    assert.deepEqual(
      getGenreSelectorState({ genresLoading: true, genresError: "", genres: [] }),
      { kind: "loading", message: "Cargando generos..." },
    );
  }],
  ["returns error state when genres request fails", () => {
    assert.deepEqual(
      getGenreSelectorState({ genresLoading: false, genresError: "No pudimos cargar los generos.", genres: [] }),
      { kind: "error", message: "No pudimos cargar los generos." },
    );
  }],
  ["returns empty state when the API responds without genres", () => {
    assert.deepEqual(
      getGenreSelectorState({ genresLoading: false, genresError: "", genres: [] }),
      { kind: "empty", message: "Todavia no hay generos cargados en la base. Cuando existan, vas a poder seleccionarlos aca." },
    );
  }],
  ["returns ready state when genres exist", () => {
    assert.deepEqual(
      getGenreSelectorState({ genresLoading: false, genresError: "", genres: [{ id: 1, name: "Policial" }] }),
      { kind: "ready", message: "" },
    );
  }],
  ["returns the first selected genre id for single-select fields", () => {
    assert.equal(getSingleGenreValue([8, 3]), 8);
  }],
  ["returns an empty value when no genre is selected", () => {
    assert.equal(getSingleGenreValue([]), "");
    assert.equal(getSingleGenreValue(undefined), "");
  }],
  ["builds an empty genre_ids array when the selection is cleared", () => {
    assert.deepEqual(buildSingleGenreIds(""), []);
  }],
  ["builds a single-item genre_ids array from the selected option", () => {
    assert.deepEqual(buildSingleGenreIds("12"), [12]);
  }],
];

registerProfileEditorStateTests((name, fn) => tests.push([name, fn]));
registerReadingClubStateTests((name, fn) => tests.push([name, fn]));
registerAiAutocompleteStateTests((name, fn) => tests.push([name, fn]));
registerDashboardCatalogStateTests((name, fn) => tests.push([name, fn]));
registerPublicSearchStateTests((name, fn) => tests.push([name, fn]));

tests.push(["resolves API calls against an external runtime base", async () => {
  const previousConfig = globalThis.__BOOKIA_CONFIG__;
  globalThis.__BOOKIA_CONFIG__ = { apiBaseUrl: "https://api.bookia.example/" };
  try {
    const moduleUrl = new URL(`../src/api.js?external-base=${Date.now()}`, import.meta.url);
    const { resolveApiUrl: resolveWithExternalBase } = await import(moduleUrl);
    assert.equal(resolveWithExternalBase("/me"), "https://api.bookia.example/me");
    assert.equal(resolveWithExternalBase("/catalog/12/cover"), "https://api.bookia.example/catalog/12/cover");
  } finally {
    globalThis.__BOOKIA_CONFIG__ = previousConfig;
  }
}]);

tests.push(["does not render the removed Simple y local section on the home page", () => {
  const publicPagesSource = readFileSync(new URL("../src/pages/PublicPages.jsx", import.meta.url), "utf8");
  const editorialStyles = readFileSync(new URL("../src/editorial.css", import.meta.url), "utf8");

  assert.doesNotMatch(publicPagesSource, /how-section|Simple y local|Una busqueda/);
  assert.doesNotMatch(editorialStyles, /\.how-/);
}]);

let failures = 0;
tests.push(["renders the visual pricing composition with catalog growth band", () => {
  const publicPagesSource = readFileSync(new URL("../src/pages/PublicPages.jsx", import.meta.url), "utf8");
  const editorialStyles = readFileSync(new URL("../src/editorial.css", import.meta.url), "utf8");
  assert.match(publicPagesSource, /plans-hero-art/);
  assert.match(publicPagesSource, /plans-featured/);
  assert.match(publicPagesSource, /plans-growth-band/);
  assert.match(publicPagesSource, /Adicionales de catalogo/);
  assert.match(editorialStyles, /\.plans-pricing/);
  assert.match(editorialStyles, /\.plans-growth-band/);
  assert.match(editorialStyles, /\.plans-page \.plans-cta \{[^}]*background: #f3d4c8/);
  assert.match(editorialStyles, /\.plans-hero-art/);
  assert.doesNotMatch(editorialStyles, /\.plans-hero-art \{[^}]*background: var\(--forest-deep\)/);
}]);
for (const [name, fn] of tests) {
  try {
    await fn();
    console.log(`PASS ${name}`);
  } catch (error) {
    failures += 1;
    console.error(`FAIL ${name}`);
    console.error(error);
  }
}

if (failures > 0) {
  console.error(`\n${failures} test(s) failed.`);
  process.exit(1);
}

console.log(`\n${tests.length} test(s) passed.`);
