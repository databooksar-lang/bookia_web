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
import { registerPlansPricingStateTests } from "./plansPricingState.test.js";
import { registerAnalyticsStateTests } from "./analyticsState.test.js";

import { registerDashboardNavigationStateTests } from './dashboardNavigationState.test.js';

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
  ["proxies admin pages to the API without stripping their path", () => {
    const entrypoint = readFileSync(new URL("../docker-entrypoint.sh", import.meta.url), "utf8");
    assert.match(entrypoint, /@admin path \/admin \/admin\/\*/);
    assert.match(entrypoint, /handle @admin \{\s*reverse_proxy \$\{BOOKIA_API_UPSTREAM_URL\}\s*\}/);
  }],
  ["returns a JSON deployment error for /api when the Caddy proxy is missing", () => {
    const entrypoint = readFileSync(new URL("../docker-entrypoint.sh", import.meta.url), "utf8");
    assert.match(entrypoint, /header Content-Type application\/json/);
    assert.match(entrypoint, /BOOKIA_API_UPSTREAM_URL no esta configurada/);
    assert.match(entrypoint, /respond .* 503/);
  }],
  ["revalidates the SPA entrypoint and runtime config while keeping Vite assets immutable", () => {
    const entrypoint = readFileSync(new URL("../docker-entrypoint.sh", import.meta.url), "utf8");
    assert.match(entrypoint, /@runtime_config path \/runtime-config\.js/);
    assert.match(entrypoint, /@vite_assets path \/assets\/\*/);
    assert.match(entrypoint, /route \{\s*try_files \{path\} \/index\.html\s*header \/index\.html Cache-Control "no-cache"/);
    assert.match(entrypoint, /header @runtime_config Cache-Control "no-cache"/);
    assert.match(entrypoint, /header @vite_assets Cache-Control "public, max-age=31536000, immutable"/);
  }],
  ["documents how to verify production cache headers", () => {
    const readme = readFileSync(new URL("../README.md", import.meta.url), "utf8");
    assert.match(readme, /curl -I https:\/\/tu-dominio\.com\/runtime-config\.js/);
    assert.match(readme, /Cache-Control: no-cache/);
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
registerPlansPricingStateTests((name, fn) => tests.push([name, fn]));
registerAnalyticsStateTests((name, fn) => tests.push([name, fn]));
registerDashboardNavigationStateTests((name, fn) => tests.push([name, fn]));

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

tests.push(["styles the public navbar with the reference green and circular transparent logo", () => {
  const headerSource = readFileSync(new URL("../src/components/SiteChrome.jsx", import.meta.url), "utf8");
  const styles = `${readFileSync(new URL("../src/styles.css", import.meta.url), "utf8")}\n${readFileSync(new URL("../src/editorial.css", import.meta.url), "utf8")}`;

  assert.match(headerSource, /bookia-logo-circular-transparent\.png/);
  assert.match(styles, /\.site-header\s*\{[^}]*background:\s*#0f4638;/s);
  assert.match(styles, /\.brand-name\s*\{[^}]*color:\s*#fffaf3;/s);
  assert.match(styles, /\.header-links a\s*\{[^}]*color:\s*#fffaf3;/s);
  assert.match(styles, /\.header-links a\.is-active\s*\{[^}]*border-bottom-color:\s*#fffaf3;/s);
  assert.match(styles, /\.header-links \.header-account\s*\{[^}]*background:\s*#c89a2b;[^}]*color:\s*#fffaf3;/s);
  assert.match(styles, /\.header-links \.header-account:last-child\s*\{[^}]*background:\s*#fffaf3;[^}]*color:\s*#0f4638;/s);
  assert.match(styles, /\.brand-mark\s*\{[^}]*border-radius:\s*50%;[^}]*overflow:\s*hidden;/s);
  assert.match(styles, /\.brand-mark img\s*\{[^}]*object-fit:\s*cover;/s);
}]);
let failures = 0;
tests.push(["renders the newsletter signup block below the bookstore section", () => {
  const publicPagesSource = readFileSync(new URL("../src/pages/PublicPages.jsx", import.meta.url), "utf8");

  assert.match(publicPagesSource, /Que las buenas historias tambien lleguen a tu correo\./);
  assert.match(publicPagesSource, /newsletter-subscribers/);
  assert.match(publicPagesSource, /Tu correo electronico/);
  assert.match(publicPagesSource, /Quiero recibir novedades/);
}]);
tests.push(["routes registration through the supported reader and bookstore flows", () => {
  const appSource = readFileSync(new URL("../src/App.jsx", import.meta.url), "utf8");
  const authPagesSource = readFileSync(new URL("../src/pages/AuthPages.jsx", import.meta.url), "utf8");
  const headerSource = readFileSync(new URL("../src/components/SiteChrome.jsx", import.meta.url), "utf8");
  const dashboardSource = readFileSync(new URL("../src/pages/DashboardPage.jsx", import.meta.url), "utf8");

  assert.match(appSource, /RegisterPage/);
  assert.match(appSource, /pathname === "\/register"/);
  assert.match(authPagesSource, /export function RegisterPage/);
  assert.match(authPagesSource, /auth\/register\/reader/);
  assert.match(authPagesSource, /auth\/register\/bookstore/);
  assert.match(authPagesSource, /Soy lector\/a/);
  assert.match(authPagesSource, /Tengo una libreria/);
  assert.match(headerSource, /const accountHref = me\?\.bookstore \? "\/dashboard" : "\/"/);
  assert.match(dashboardSource, /!me\.bookstore/);
}]);
tests.push(["emits one session-expiry event for repeated unauthorized API responses", async () => {
  const previousFetch = globalThis.fetch;
  const previousDocument = globalThis.document;
  globalThis.document = { cookie: "bookia_csrf=valid" };
  const moduleUrl = new URL(`../src/api.js?session-expiry=${Date.now()}`, import.meta.url);
  const { apiFetch, resetSessionExpiryForTests, subscribeToSessionExpiry } = await import(moduleUrl);
  const expiredResponse = () => ({ status: 401, ok: false, headers: { get: () => "application/json" }, json: async () => ({ detail: "Sesion vencida." }) });
  let expiryEvents = 0;
  globalThis.fetch = async () => expiredResponse();
  resetSessionExpiryForTests();
  const unsubscribe = subscribeToSessionExpiry(() => { expiryEvents += 1; });
  try {
    await assert.rejects(() => apiFetch("/me"), /Sesion vencida/);
    await assert.rejects(() => apiFetch("/dashboard/catalog"), /Sesion vencida/);
    assert.equal(expiryEvents, 1);
  } finally {
    unsubscribe();
    globalThis.fetch = previousFetch;
    globalThis.document = previousDocument;
  }
}]);

tests.push(["redirects expired sessions to login with an explanation", () => {
  const appSource = readFileSync(new URL("../src/App.jsx", import.meta.url), "utf8");
  const authPagesSource = readFileSync(new URL("../src/pages/AuthPages.jsx", import.meta.url), "utf8");
  assert.match(appSource, /subscribeToSessionExpiry/);
  assert.match(appSource, /navigate\("\/login\?reason=session-expired"\)/);
  assert.match(authPagesSource, /Tu sesion vencio porque se inicio sesion en otro dispositivo\./);
}]);
tests.push(["publishes a cookies policy for technical session cookies", () => {
  const appSource = readFileSync(new URL("../src/App.jsx", import.meta.url), "utf8");
  const privacySource = readFileSync(new URL("../src/pages/PrivacyPage.jsx", import.meta.url), "utf8");
  const siteChromeSource = readFileSync(new URL("../src/components/SiteChrome.jsx", import.meta.url), "utf8");
  const cookiePolicySource = readFileSync(new URL("../src/pages/CookiePolicyPage.jsx", import.meta.url), "utf8");

  assert.match(appSource, /CookiePolicyPage/);
  assert.match(appSource, /pathname === "\/cookies"/);
  assert.match(siteChromeSource, /href="\/cookies">Cookies/);
  assert.match(privacySource, /href="\/cookies"/);
  assert.match(cookiePolicySource, /Politica de Cookies/);
  assert.match(cookiePolicySource, /bookia_session/);
  assert.match(cookiePolicySource, /bookia_csrf/);
  assert.match(cookiePolicySource, /No usamos cookies de analitica ni publicidad/);
}]);
tests.push(["publishes terms and conditions for Bookia's marketplace role", () => {
  const appSource = readFileSync(new URL("../src/App.jsx", import.meta.url), "utf8");
  const authPagesSource = readFileSync(new URL("../src/pages/AuthPages.jsx", import.meta.url), "utf8");
  const privacySource = readFileSync(new URL("../src/pages/PrivacyPage.jsx", import.meta.url), "utf8");
  const siteChromeSource = readFileSync(new URL("../src/components/SiteChrome.jsx", import.meta.url), "utf8");
  const termsSource = readFileSync(new URL("../src/pages/TermsPage.jsx", import.meta.url), "utf8");

  assert.match(appSource, /TermsPage/);
  assert.match(appSource, /pathname === "\/terms"/);
  assert.match(siteChromeSource, /href="\/terms">Terminos/);
  assert.match(authPagesSource, /Acepto los/);
  assert.match(authPagesSource, /href="\/terms"/);
  assert.match(authPagesSource, /href="\/privacy"/);
  assert.match(privacySource, /href="\/terms"/);
  assert.match(termsSource, /Terminos y Condiciones/);
  assert.match(termsSource, /Vigente desde el 23 de julio de 2026/);
  assert.match(termsSource, /Marcelo Gabriel Gonzalez/);
  assert.match(termsSource, /bookia.app.admin@gmail.com/);
  assert.match(termsSource, /Bookia no vende libros directamente/);
  assert.match(termsSource, /operacion comercial se acuerda directamente entre la persona interesada y la libreria/);
  assert.match(termsSource, /OpenAI/);
  assert.match(termsSource, /Politica de Privacidad/);
  assert.match(termsSource, /Politica de Cookies/);
  assert.match(termsSource, /no reemplaza asesoramiento legal profesional/);
}]);
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
