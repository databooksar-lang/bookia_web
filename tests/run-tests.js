import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createServer } from "vite";

import { isBookiaApiRoute } from "../src/apiRoutes.js";
import { resolveApiUrl } from "../src/api.js";
import { buildSingleGenreIds, getSingleGenreValue } from "../src/genreSelection.js";
import { getGenreSelectorState } from "../src/genreSelectorState.js";
import { registerProfileEditorStateTests } from "./profileEditorState.test.js";
import { registerBookstoreDescriptionFormatTests } from "./bookstoreDescriptionFormat.test.js";
import { registerBookstoreDescriptionRenderTests } from "./bookstoreDescriptionRender.test.js";
import { registerRichDescriptionEditorTests } from "./richDescriptionEditor.test.js";
import { registerReadingClubStateTests } from "./readingClubState.test.js";
import { registerAiAutocompleteStateTests } from "./aiAutocompleteState.test.js";
import { registerDashboardCatalogStateTests } from "./dashboardCatalogState.test.js";
import { registerPublicSearchStateTests } from "./publicSearchState.test.js";
import { registerPlansPricingStateTests } from "./plansPricingState.test.js";
import { registerAnalyticsStateTests } from "./analyticsState.test.js";
import { registerRegisterStateTests } from "./registerState.test.js";
import { registerBillingStateTests } from "./billingState.test.js";
import { registerBillingSubscriptionStateTests } from "./billingSubscriptionState.test.js";
import { registerReaderProfileStateTests } from "./readerProfileState.test.js";
import { registerReaderProfileNavigationStateTests } from "./readerProfileNavigationState.test.js";
import { registerFavoritesStateTests } from "./favoritesState.test.js";
import { registerAccountDestinationTests } from "./accountDestination.test.js";
import { registerBookSharingStateTests } from "./bookSharingState.test.js";
import { registerReadingClubSharingStateTests } from "./readingClubSharingState.test.js";
import { registerSectionIndexTests } from "./sectionIndex.test.js";
import { registerGoogleOAuthStateTests } from "./googleOAuthState.test.js";

import { registerDashboardNavigationStateTests } from './dashboardNavigationState.test.js';

const tests = [
  ["treats /genres as an API route", () => {
    assert.equal(isBookiaApiRoute("/reading-clubs?genre_slug=policial"), true);
    assert.equal(isBookiaApiRoute("/genres"), true);
    assert.equal(isBookiaApiRoute("/genres?active=true"), true);
    assert.equal(isBookiaApiRoute("/analytics/acquisition-events"), true);
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
  ["allows the embedded admin script without weakening the site-wide CSP", () => {
    const entrypoint = readFileSync(new URL("../docker-entrypoint.sh", import.meta.url), "utf8");
    assert.match(entrypoint, /@admin path \/admin \/admin\/\*/);
    assert.match(entrypoint, /@non_admin not path \/admin \/admin\/\*/);
    assert.match(entrypoint, /img-src 'self' data: blob: https:/);
    assert.match(entrypoint, /header @non_admin \{\s*Content-Security-Policy "[^"]*script-src 'self'"\s*\}/);
    assert.match(entrypoint, /header @admin \{\s*Content-Security-Policy "[^"]*script-src 'self' 'unsafe-inline'"\s*\}/);
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
  ["adds production security headers to proxied API and SPA responses", () => {
    const entrypoint = readFileSync(new URL("../docker-entrypoint.sh", import.meta.url), "utf8");
    assert.match(entrypoint, /Strict-Transport-Security "max-age=31536000; includeSubDomains"/);
    assert.match(entrypoint, /Content-Security-Policy/);
    assert.match(entrypoint, /X-Content-Type-Options "nosniff"/);
    assert.match(entrypoint, /X-Frame-Options "DENY"/);
    assert.match(entrypoint, /Referrer-Policy "strict-origin-when-cross-origin"/);
    assert.match(entrypoint, /Permissions-Policy "camera=\(\), microphone=\(\), geolocation=\(\)"/);
  }],
  ["keeps local environment secrets out of the frontend image build context", () => {
    const dockerignore = readFileSync(new URL("../.dockerignore", import.meta.url), "utf8");
    assert.match(dockerignore, /^\.env$/m);
    assert.match(dockerignore, /^\.env\.\*$/m);
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
registerBookstoreDescriptionFormatTests((name, fn) => tests.push([name, fn]));
registerBookstoreDescriptionRenderTests((name, fn) => tests.push([name, fn]));
registerRichDescriptionEditorTests((name, fn) => tests.push([name, fn]));
registerReadingClubStateTests((name, fn) => tests.push([name, fn]));
registerAiAutocompleteStateTests((name, fn) => tests.push([name, fn]));
registerDashboardCatalogStateTests((name, fn) => tests.push([name, fn]));
registerPublicSearchStateTests((name, fn) => tests.push([name, fn]));
registerSectionIndexTests((name, fn) => tests.push([name, fn]));
registerGoogleOAuthStateTests((name, fn) => tests.push([name, fn]));
registerPlansPricingStateTests((name, fn) => tests.push([name, fn]));
registerAnalyticsStateTests((name, fn) => tests.push([name, fn]));
registerRegisterStateTests((name, fn) => tests.push([name, fn]));
registerBillingStateTests((name, fn) => tests.push([name, fn]));
registerBillingSubscriptionStateTests((name, fn) => tests.push([name, fn]));
registerDashboardNavigationStateTests((name, fn) => tests.push([name, fn]));
registerReaderProfileStateTests((name, fn) => tests.push([name, fn]));
registerReaderProfileNavigationStateTests((name, fn) => tests.push([name, fn]));
registerFavoritesStateTests((name, fn) => tests.push([name, fn]));
registerAccountDestinationTests((name, fn) => tests.push([name, fn]));
registerBookSharingStateTests((name, fn) => tests.push([name, fn]));
registerReadingClubSharingStateTests((name, fn) => tests.push([name, fn]));

tests.push(["offers a reusable favorite control throughout public book discovery", () => {
  const publicPagesSource = readFileSync(new URL("../src/pages/PublicPages.jsx", import.meta.url), "utf8");
  const favoriteButtonSource = readFileSync(new URL("../src/components/FavoriteBookButton.jsx", import.meta.url), "utf8");
  const editorialStyles = readFileSync(new URL("../src/editorial.css", import.meta.url), "utf8");

  assert.match(favoriteButtonSource, />Favoritos<\/span>/);
  assert.match(favoriteButtonSource, /aria-label=\{isFavorite \? "Quitar de favoritos" : "Guardar en favoritos"\}/);
  assert.match(publicPagesSource, /function useFavoriteBooks\(me\)/);
  assert.match(publicPagesSource, /<FavoriteBookButton itemId=\{item\.id\}/);
  assert.match(publicPagesSource, /<FavoriteBookButton itemId=\{selectedBook\.id\}/);
  assert.match(publicPagesSource, /navigate\("\/login"\)/);
  assert.match(editorialStyles, /\.favorite-book-label\s*\{/);
  assert.match(publicPagesSource, /className="book-card-meta-row"/);
  assert.match(publicPagesSource, /className="book-card-statuses"/);
  assert.match(publicPagesSource, /<div className="book-card-meta-row">\s*<div className="book-card-statuses">[\s\S]*?<\/div>\s*<FavoriteBookButton itemId=\{item\.id\}/);
  assert.match(editorialStyles, /\.book-card-meta-row\s*\{[^}]*display:\s*flex;[^}]*flex-wrap:\s*wrap;/s);
  assert.match(editorialStyles, /\.book-card-statuses\s*\{[^}]*display:\s*flex;[^}]*flex-wrap:\s*wrap;/s);
  assert.match(editorialStyles, /\.book-card-meta-row\s*>\s*\.favorite-book-button\s*\{[^}]*flex:\s*0\s+0\s+auto;[^}]*margin-left:\s*auto;/s);
  assert.doesNotMatch(editorialStyles, /\.book-card\s*>\s*\.favorite-book-button\s*\{[^}]*position:\s*absolute;/s);
}]);

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
tests.push(["centralizes logout in the authenticated site header", () => {
  const headerSource = readFileSync(new URL("../src/components/SiteChrome.jsx", import.meta.url), "utf8");
  const dashboardSource = readFileSync(new URL("../src/pages/DashboardPage.jsx", import.meta.url), "utf8");
  const readerProfileSource = readFileSync(new URL("../src/pages/ReaderProfilePage.jsx", import.meta.url), "utf8");

  assert.match(headerSource, /apiFetch\("\/auth\/logout", \{ method: "POST" \}\)/);
  assert.match(headerSource, /\.finally\(\(\) => navigate\("\/"\)\)/);
  assert.match(headerSource, /\{me \? <button[^>]*>Cerrar sesion<\/button> : null\}/s);
  assert.doesNotMatch(dashboardSource, /function logout\(\)/);
  assert.doesNotMatch(dashboardSource, /Cerrar sesion/);
  assert.doesNotMatch(readerProfileSource, /function logout\(\)/);
  assert.doesNotMatch(readerProfileSource, /Cerrar sesion/);
}]);
tests.push(["keeps plan selection inside the bookstore registration flow", () => {
  const appSource = readFileSync(new URL("../src/App.jsx", import.meta.url), "utf8");
  const registerSource = readFileSync(new URL("../src/pages/RegisterPage.jsx", import.meta.url), "utf8");
  const plansSource = readFileSync(new URL("../src/pages/PublicPages.jsx", import.meta.url), "utf8");
  const redirectSource = readFileSync(new URL("../src/components/Redirect.jsx", import.meta.url), "utf8");

  assert.match(appSource, /isPlansRegistrationContext\(search\)/);
  assert.doesNotMatch(appSource, /else\s*\{\s*navigate\("\/register"\);/);
  assert.doesNotMatch(registerSource, /if \(queryState\.kind === "invalid"\) \{\s*navigate\("\/register"\);/);
  assert.match(registerSource, /getRegisterQueryState/);
  assert.doesNotMatch(registerSource, /if \(me\) \{\s*navigate\(/);
  assert.match(redirectSource, /useEffect\(\(\) => \{\s*navigate\(to\);/);
  assert.match(appSource, /page = <Redirect to="\/register" \/>/);
  assert.match(registerSource, /return <Redirect to=\{me\.bookstore \? "\/dashboard" : "\/"\} \/>/);
  assert.match(registerSource, /return <Redirect to="\/register" \/>/);
  assert.match(registerSource, /navigate\("\/plans\?register=bookstore"\)/);
  assert.match(registerSource, /buildRegisterPath/);
  assert.match(registerSource, /getTrustedMercadoPagoCheckoutUrl/);
  assert.match(registerSource, /window\.location\.assign\(getTrustedMercadoPagoCheckoutUrl\(checkout\.checkout_url\)\)/);
  assert.doesNotMatch(registerSource, /Plan inicial<select/);
  assert.match(plansSource, /isRegistrationFlow/);
  assert.match(plansSource, /\{ code: "base", name: "Prueba gratis"/);
  assert.match(plansSource, /plus_ai/);
}]);

tests.push(["removes public plans links in favor of registration", () => {
  const headerSource = readFileSync(new URL("../src/components/SiteChrome.jsx", import.meta.url), "utf8");
  const publicPagesSource = readFileSync(new URL("../src/pages/PublicPages.jsx", import.meta.url), "utf8");
  const authPagesSource = readFileSync(new URL("../src/pages/AuthPages.jsx", import.meta.url), "utf8");
  const editorialStyles = readFileSync(new URL("../src/editorial.css", import.meta.url), "utf8");

  assert.doesNotMatch(headerSource, /href="\/plans"/);
  assert.doesNotMatch(publicPagesSource, /href="\/plans"/);
  assert.doesNotMatch(authPagesSource, /href="\/plans"/);
  assert.match(publicPagesSource, /href="\/register"/);
  assert.match(authPagesSource, /href="\/about"/);
  assert.match(editorialStyles, /\.plans-select-action/);
}]);
tests.push(["renders registration choices without image badges", async () => {
  const vite = await createServer({ server: { middlewareMode: true }, appType: "custom" });
  try {
    const { RegisterPage } = await vite.ssrLoadModule("/src/pages/RegisterPage.jsx");
    const markup = renderToStaticMarkup(createElement(RegisterPage, { locationSearch: "", me: null, onRegister: () => {} }));
    assert.match(markup, /reader-books\.png/);
    assert.match(markup, /bookstore-front\.png/);
    assert.doesNotMatch(markup, /register-choice-icon/);
  } finally {
    await vite.close();
  }
}]);
tests.push(["renders an accessible password visibility control in registration forms", async () => {
  const vite = await createServer({ server: { middlewareMode: true }, appType: "custom" });
  try {
    const { RegisterPage } = await vite.ssrLoadModule("/src/pages/RegisterPage.jsx");
    const markup = renderToStaticMarkup(createElement(RegisterPage, { locationSearch: "?profile=reader", me: null, onRegister: () => {} }));

    assert.match(markup, /type="password"/);
    assert.match(markup, /aria-label="Mostrar/);
    assert.match(markup, /class="register-password-toggle"/);
    assert.match(markup, /class="register-legal"[^>]*>.*class="register-legal-copy"/s);
    const editorialStyles = readFileSync(new URL("../src/editorial.css", import.meta.url), "utf8");
    assert.match(editorialStyles, /\.register-password-field\s*\{[^}]*position:\s*relative;/s);
    assert.match(editorialStyles, /\.register-password-field input\s*\{[^}]*padding-right:\s*48px;/s);
    assert.match(editorialStyles, /\.register-password-toggle\s*\{[^}]*min-width:\s*44px;/s);
    assert.match(editorialStyles, /\.register-legal input\[type="checkbox"\]\s*\{[^}]*width:\s*14px;[^}]*height:\s*14px;/s);
  } finally {
    await vite.close();
  }
}]);
tests.push(["renders editable pending payer email and read-only active payer", async () => {
  const vite = await createServer({ server: { middlewareMode: true }, appType: "custom" });
  try {
    const { BillingSubscriptionPanel } = await vite.ssrLoadModule("/src/components/BillingSubscriptionPanel.jsx");
    const baseBilling = {
      plan_code: "base", catalog_limit: 50, total_amount_ars: 20000, currency: "ARS",
      trial_ends_at: "2026-09-01T00:00:00Z", current_period_end: "2026-09-01T00:00:00Z",
      payer_email: "payments@example.com", payer_email_editable: true, scheduled_change: null,
    };
    const pendingMarkup = renderToStaticMarkup(createElement(BillingSubscriptionPanel, { initialBilling: { ...baseBilling, status: "payment_pending" } }));
    const activeMarkup = renderToStaticMarkup(createElement(BillingSubscriptionPanel, { initialBilling: { ...baseBilling, status: "active", payer_email_editable: false } }));

    assert.match(pendingMarkup, /Correo de la cuenta de Mercado Pago/);
    assert.match(pendingMarkup, /value="payments@example.com"/);
    assert.match(pendingMarkup, /Confirmar en Mercado Pago/);
    assert.match(activeMarkup, /Cuenta pagadora/);
    assert.match(activeMarkup, /payments@example.com/);
    assert.doesNotMatch(activeMarkup, /type="email"/);
  } finally {
    await vite.close();
  }
}]);
let failures = 0;
tests.push(["renders one decorative image in the public search hero illustration", () => {
  const publicPagesSource = readFileSync(new URL("../src/pages/PublicPages.jsx", import.meta.url), "utf8");
  const editorialStyles = readFileSync(new URL("../src/editorial.css", import.meta.url), "utf8");

  assert.match(publicPagesSource, /<img className="hero-illustration" src="\/images\/hero-bookia-discovery\.webp" alt="" \/>/);
  assert.doesNotMatch(publicPagesSource, /hero-book hero-book-|hero-open-book|hero-catalog-card|hero-leaf/);
  assert.match(editorialStyles, /\.hero-illustration\s*\{/);
  assert.doesNotMatch(editorialStyles, /\.hero-book(?:\s|\.|\{)|\.hero-open-book|\.hero-catalog-card|\.hero-leaf/);
}]);
tests.push(["uses a responsive decorative bookstore facade in the Bookia bookstores heading", () => {
  const publicPagesSource = readFileSync(new URL("../src/pages/PublicPages.jsx", import.meta.url), "utf8");
  const editorialStyles = readFileSync(new URL("../src/editorial.css", import.meta.url), "utf8");
  const illustrationPath = new URL("../public/images/bookstores-section-facade.png", import.meta.url);

  assert.equal(existsSync(illustrationPath), true);
  assert.match(publicPagesSource, /<img className="bookstores-section-illustration" src="\/images\/bookstores-section-facade\.png" alt="" \/>/);
  assert.doesNotMatch(publicPagesSource, /Explor\\u00E1 sus cat\\u00E1logos y encontr\\u00E1 nuevas librer\\u00EDas para volver\./);
  assert.match(editorialStyles, /\.bookstores-section-illustration\s*(?:,|\{)/);
  assert.match(editorialStyles, /@media \(max-width: 820px\)[\s\S]*?\.bookstores-section-illustration\s*(?:,|\{)/);
}]);

tests.push(["uses a responsive decorative reading-club illustration in the section heading", () => {
  const publicPagesSource = readFileSync(new URL("../src/pages/PublicPages.jsx", import.meta.url), "utf8");
  const editorialStyles = readFileSync(new URL("../src/editorial.css", import.meta.url), "utf8");
  const illustrationPath = new URL("../public/images/reading-clubs-section.png", import.meta.url);

  assert.equal(existsSync(illustrationPath), true);
  assert.match(publicPagesSource, /<img className="reading-clubs-section-illustration" src="\/images\/reading-clubs-section\.png" alt="" \/>/);
  assert.doesNotMatch(publicPagesSource, /Descubr\\u00ED encuentros p\\u00FAblicos de la comunidad Bookia y eleg\\u00ED el g\\u00E9nero que m\\u00E1s te interesa\./);
  assert.match(editorialStyles, /\.reading-clubs-section-illustration\s*(?:,|\{)/);
  assert.match(editorialStyles, /@media \(max-width: 820px\)[\s\S]*?\.reading-clubs-section-illustration\s*(?:,|\{)/);
}]);
tests.push(["keeps the bookstore and reading-club sections visually compact", () => {
  const editorialStyles = readFileSync(new URL("../src/editorial.css", import.meta.url), "utf8");

  assert.match(editorialStyles, /\.bookstores-section\s*\{[^}]*padding:\s*72px 0 56px;/s);
  assert.match(editorialStyles, /\.reading-clubs-section\s*\{[^}]*padding:\s*56px 0 72px;/s);
  assert.match(editorialStyles, /\.bookstores-section-illustration,[\s\S]*?\.reading-clubs-section-illustration\s*\{[^}]*width:\s*clamp\(220px, 20vw, 260px\);/s);
}]);
tests.push(["keeps the public search form hierarchy responsive", () => {
  const publicPagesSource = readFileSync(new URL("../src/pages/PublicPages.jsx", import.meta.url), "utf8");
  const editorialStyles = readFileSync(new URL("../src/editorial.css", import.meta.url), "utf8");

  assert.match(publicPagesSource, /<p className="search-panel-heading">Busc. un libro<\/p>/);
  assert.match(editorialStyles, /\.search-panel-heading\s*\{[^}]*grid-column:\s*1\s*\/\s*-1;/s);
  assert.match(publicPagesSource, /search-field-query/);
  assert.match(publicPagesSource, /search-filters/);
  assert.match(editorialStyles, /\.search-filter-fields\s*\{[^}]*grid-template-columns:\s*repeat\(3,/s);
  assert.match(editorialStyles, /\.search-submit\s*\{[^}]*grid-column:\s*2;/s);
  assert.match(editorialStyles, /@media \(max-width: 820px\)[\s\S]*?\.search-panel\s*\{\s*grid-template-columns:\s*1fr;/);
}]);
tests.push(["uses a progressive and accessible public book search flow", () => {
  const publicPagesSource = readFileSync(new URL("../src/pages/PublicPages.jsx", import.meta.url), "utf8");

  assert.match(publicPagesSource, /¿Qué libro buscás\?/);
  assert.match(publicPagesSource, /Ej\.: Rayuela, Julio Cortázar o Sudamericana/);
  assert.match(publicPagesSource, /<details className="search-filters">/);
  assert.match(publicPagesSource, /<summary>Más filtros<\/summary>/);
  assert.match(publicPagesSource, /No encontramos libros con esos filtros/);
  assert.match(publicPagesSource, /Limpiar filtros/);
}]);
tests.push(["keeps Buscar as the home page with Bookia's approved public-search copy", () => {
  const appSource = readFileSync(new URL("../src/App.jsx", import.meta.url), "utf8");
  const publicPagesSource = readFileSync(new URL("../src/pages/PublicPages.jsx", import.meta.url), "utf8");

  assert.match(appSource, /let page = <HomePage me=\{me\} \/>;/);
  assert.match(publicPagesSource, /ENCONTR. TU PR.XIMO LIBRO/);
  assert.match(publicPagesSource, /Encontr. el libro que busc.s\./);
  assert.match(publicPagesSource, /Busc. por t.tulo, autor o editorial\./);
  assert.match(publicPagesSource, /Confirm. disponibilidad por WhatsApp antes de ir\./);
  assert.match(publicPagesSource, /Hac\\u00E9 que tus libros lleguen a m\\u00E1s lectores\./);
  assert.match(publicPagesSource, /Crear cuenta para mi librer/);
  assert.match(publicPagesSource, /newsletter-subscribers/);
  assert.match(publicPagesSource, /Tu correo electr\\u00F3nico/);
  assert.match(publicPagesSource, /Quiero recibir novedades/);
}]);
tests.push(["places contextual benefit strips after the bookstore and reading-club sections", () => {
  const publicPagesSource = readFileSync(new URL("../src/pages/PublicPages.jsx", import.meta.url), "utf8");
  const homePageSource = publicPagesSource.match(/export function HomePage\([^)]*\) \{([\s\S]*?)\r?\n\}\r?\n\r?\n\r?\nexport function BookstoresPage/);
  const bookstoresSectionSource = publicPagesSource.match(/function BookstoresSection\(\{ stores, loading \}\) \{([\s\S]*?)\r?\n\}\r?\n\r?\n\r?\nfunction ReadingClubsSection/);
  const readingClubsSectionSource = publicPagesSource.match(/function ReadingClubsSection\(\) \{([\s\S]*?)\r?\n\}\r?\n\r?\nfunction NewsletterSignup/);

  assert.ok(homePageSource, "HomePage should remain isolated before BookstoresPage");
  assert.ok(bookstoresSectionSource, "BookstoresSection should remain isolated before ReadingClubsSection");
  assert.ok(readingClubsSectionSource, "ReadingClubsSection should remain isolated before NewsletterSignup");
  assert.match(homePageSource[1], /<HeroSearch[\s\S]*?<BenefitsStrip benefits=\{SEARCH_BENEFITS\} ariaLabel="Beneficios de la b\u00FAsqueda de libros" \/>[\s\S]*?<SearchResults[\s\S]*?<BookstoresSection/s);
  assert.match(publicPagesSource, /Busc. como te resulte m.s f.cil/);
  assert.match(publicPagesSource, /Eleg. c.mo quer.s leer/);
  assert.match(publicPagesSource, /Consult. a la librer.a/);
  assert.match(bookstoresSectionSource[1], /<BenefitsStrip(?: className="bookstores-benefits-strip")? benefits=\{BOOKSTORE_BENEFITS\} ariaLabel="Beneficios para librer\u00EDas" \/>/);
  assert.match(readingClubsSectionSource[1], /<BenefitsStrip(?: className="reading-clubs-benefits-strip")? benefits=\{READING_CLUB_BENEFITS\} ariaLabel="Beneficios de los clubes de lectura" \/>/);
  assert.match(publicPagesSource, /Encontr. tu comunidad/);
  assert.match(publicPagesSource, /Conoc. cada encuentro/);
  assert.match(publicPagesSource, /Compart. la invitaci.n/);
}]);
tests.push(["makes bookstore and reading-club discovery recoverable", () => {
  const publicPagesSource = readFileSync(new URL("../src/pages/PublicPages.jsx", import.meta.url), "utf8");

  assert.match(publicPagesSource, /Encontr. librer.as para tu pr.xima lectura/);
  assert.match(publicPagesSource, /Busc. una librer.a/);
  assert.match(publicPagesSource, /Todos los g.neros/);
  assert.match(publicPagesSource, /Ver todas las librer.as/);
  assert.match(publicPagesSource, /Mostrar menos/);
  assert.match(publicPagesSource, /Todav.a no hay librer.as disponibles/);
  assert.match(publicPagesSource, /Encontr. un club para compartir lecturas/);
  assert.match(publicPagesSource, /Busc. por nombre o tema/);
  assert.match(publicPagesSource, /Ej\.: ciencia ficci.n, poes.a o Club de novela/);
  assert.match(publicPagesSource, /Ver todos los clubes/);
  assert.match(publicPagesSource, /Ver m.s sobre este encuentro/);
  assert.match(publicPagesSource, /aria-expanded=\{showAll/);
  assert.match(publicPagesSource, /Limpiar filtros/);
}]);
tests.push(["separates the reader search and bookstore acquisition routes", () => {
  const appSource = readFileSync(new URL("../src/App.jsx", import.meta.url), "utf8");
  const headerSource = readFileSync(new URL("../src/components/SiteChrome.jsx", import.meta.url), "utf8");
  const publicPagesSource = readFileSync(new URL("../src/pages/PublicPages.jsx", import.meta.url), "utf8");

  assert.match(appSource, /pathname === "\/para-librerias"\) page = <BookstoresPage \/>;/);
  assert.match(headerSource, /\{ href: "\/", label: "Buscar libros" \}/);
  assert.match(headerSource, /\{ href: "\/para-librerias", label: "Para librerias" \}/);
  assert.match(headerSource, /<AppLink href="\/para-librerias">Para librerias<\/AppLink>/);
  assert.match(publicPagesSource, /export function BookstoresPage\(\)/);
  assert.match(publicPagesSource, /Crear cuenta para mi librer/);
}]);
tests.push(["presents About Bookia as a dual-audience discovery and contact platform", () => {
  const publicPagesSource = readFileSync(new URL("../src/pages/PublicPages.jsx", import.meta.url), "utf8");
  const aboutPageSource = publicPagesSource.match(/export function AboutPage\(\) \{([\s\S]*?)\r?\n\}\r?\n\r?\nconst AVAILABILITY_LABELS/);

  assert.ok(aboutPageSource, "AboutPage should remain isolated before catalog helpers");
  const page = aboutPageSource[1];
  assert.match(page, /Libros, librer.as y lectores, en un mismo lugar/);
  assert.match(page, /Busc. un libro/);
  assert.match(page, /Descubr. qui.n lo tiene/);
  assert.match(page, /Contact. directamente/);
  assert.match(page, /Bookia no vende libros ni procesa pagos/);
  assert.match(page, /Creada por Marcelo G\. Gonz.lez/);
  assert.match(page, /Bookia naci. de una pasi.n por los libros y de una idea simple: hacer m.s f.cil el encuentro entre lectores y librer.as\./);
  assert.match(page, /Reunimos cat.logos en un solo lugar para que buscar un t.tulo, descubrir una librer.a y consultar su disponibilidad requiera menos vueltas\./);
  assert.match(page, /las librer.as pueden dedicar m.s tiempo a lo que mejor hacen: recomendar libros y construir comunidad\./);
  assert.doesNotMatch(page, /plataforma integral|automatizar y optimizar los procesos de gesti.n/i);
  assert.match(page, /href="\/"/);
  assert.match(page, /href="\/register"/);
  assert.match(page, /<img className="about-hero-logo" src="\/images\/logo-sin-fondo\.png" alt="Logo circular de Bookia" \/>/);
  assert.doesNotMatch(page, /about-hero-panel/);
  assert.doesNotMatch(page, /compr. en Bookia|pag. en Bookia|procesamos pagos/i);
}]);
tests.push(["routes registration through the supported reader and bookstore flows", () => {
  const appSource = readFileSync(new URL("../src/App.jsx", import.meta.url), "utf8");
  const registerSource = readFileSync(new URL("../src/pages/RegisterPage.jsx", import.meta.url), "utf8");
  const registerStateSource = readFileSync(new URL("../src/registerState.js", import.meta.url), "utf8");
  const headerSource = readFileSync(new URL("../src/components/SiteChrome.jsx", import.meta.url), "utf8");
  const dashboardSource = readFileSync(new URL("../src/pages/DashboardPage.jsx", import.meta.url), "utf8");

  assert.match(appSource, /RegisterPage/);
  assert.match(appSource, /pathname === "\/register"/);
  assert.match(registerSource, /export function RegisterPage/);
  assert.match(registerStateSource, /auth\/register\/reader/);
  assert.match(registerStateSource, /auth\/register\/bookstore/);
  assert.match(registerSource, /register-choice-grid/);
  assert.match(registerSource, /reader-books\.png/);
  assert.match(registerSource, /bookstore-front\.png/);
  assert.doesNotMatch(registerSource, /register-trust/);
  assert.match(headerSource, /const accountHref = me\?\.bookstore \? "\/dashboard" : me \? "\/profile" : "\/login"/);
  assert.match(dashboardSource, /!me\.bookstore/);
}]);
tests.push(["offers catalog add-ons after bookstore account credentials", () => {
  const registerSource = readFileSync(new URL("../src/pages/RegisterPage.jsx", import.meta.url), "utf8");
  const editorialStyles = readFileSync(new URL("../src/editorial.css", import.meta.url), "utf8");

  assert.match(registerSource, /apiFetch\("\/commercial-prices"\)/);
  assert.match(registerSource, /Sin adicional/);
  assert.match(registerSource, /Hasta 50 libros/);
  assert.match(registerSource, /Hasta 100 libros/);
  assert.match(registerSource, /Hasta 200 libros/);
  assert.match(registerSource, /catalog_100/);
  assert.match(registerSource, /catalog_200/);
  assert.match(registerSource, /type="radio"/);
  assert.match(registerSource, /Hoy: ARS 0/);
  assert.match(registerSource, /primer cobro se estima/);
  assert.match(registerSource, /Crear cuenta y autorizar Mercado Pago/);
  assert.match(editorialStyles, /\.register-catalog-options/);
}]);

tests.push(["keeps the book share menu inside the mobile viewport", () => {
  const editorialStyles = readFileSync(new URL("../src/editorial.css", import.meta.url), "utf8");

  assert.match(editorialStyles, /\.book-share-options\s*\{[^}]*box-sizing:\s*border-box;/);
  assert.match(editorialStyles, /@media \(max-width: 620px\)[\s\S]*?\.book-share-options\s*\{[^}]*width:\s*min\(220px,\s*calc\(100vw\s*-\s*32px\)\);[^}]*min-width:\s*0;/);
  assert.match(editorialStyles, /\.book-share-options \.book-share-story-button\s*\{[^}]*min-width:\s*0;[^}]*white-space:\s*normal;[^}]*overflow-wrap:\s*anywhere;/);
  assert.doesNotMatch(editorialStyles, /\.dashboard-list-active \.card-actions button(?:\s*\{|:has)/);
  assert.match(editorialStyles, /\.dashboard-list-active \.card-actions-main > button,\s*\.dashboard-list-active \.card-actions-main > \.book-share-menu > \.book-share-trigger,\s*\.dashboard-list-active \.card-actions > \.danger-button\s*\{/);
  assert.match(editorialStyles, /\.dashboard-list-active \.card-actions-main > button:has\(svg\)\s*\{/);
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

tests.push(["does not treat the initial session check as an expired active session", async () => {
  const previousFetch = globalThis.fetch;
  const previousDocument = globalThis.document;
  globalThis.document = { cookie: "bookia_csrf=valid" };
  const moduleUrl = new URL(`../src/api.js?initial-session-check=${Date.now()}`, import.meta.url);
  const { apiFetch, resetSessionExpiryForTests, subscribeToSessionExpiry } = await import(moduleUrl);
  const expiredResponse = () => ({ status: 401, ok: false, headers: { get: () => "application/json" }, json: async () => ({ detail: "Sesion vencida." }) });
  let expiryEvents = 0;
  globalThis.fetch = async () => expiredResponse();
  resetSessionExpiryForTests();
  const unsubscribe = subscribeToSessionExpiry(() => { expiryEvents += 1; });
  try {
    await assert.rejects(() => apiFetch("/me", { suppressSessionExpiry: true }), /Sesion vencida/);
    assert.equal(expiryEvents, 0);
  } finally {
    unsubscribe();
    globalThis.fetch = previousFetch;
    globalThis.document = previousDocument;
  }
}]);

tests.push(["redirects expired sessions to login with an explanation", () => {
  const appSource = readFileSync(new URL("../src/App.jsx", import.meta.url), "utf8");
  const authPagesSource = readFileSync(new URL("../src/pages/AuthPages.jsx", import.meta.url), "utf8");
  const editorialStyles = readFileSync(new URL("../src/editorial.css", import.meta.url), "utf8");
  assert.match(appSource, /subscribeToSessionExpiry/);
  assert.match(appSource, /navigate\("\/login\?reason=session-expired"\)/);
  assert.match(authPagesSource, /Tu sesion vencio porque se inicio sesion en otro dispositivo\./);
}]);
tests.push(["uses inclusive copy across the access flow", () => {
  const authPagesSource = readFileSync(new URL("../src/pages/AuthPages.jsx", import.meta.url), "utf8");
  const siteChromeSource = readFileSync(new URL("../src/components/SiteChrome.jsx", import.meta.url), "utf8");

  assert.match(authPagesSource, /Bookia, para quienes viven los libros\./);
  assert.match(authPagesSource, /Ingresá para seguir explorando, compartiendo y conectando alrededor de las historias que te gustan\./);
  assert.match(authPagesSource, /<AppLink href="\/about">Conocé Bookia/);
  assert.match(authPagesSource, /label="Ingresar a Bookia" title="Qué bueno verte de nuevo" description="Ingresá con tu correo y contraseña para continuar\./);
  assert.match(authPagesSource, /Ya tenés una sesión activa/);
  assert.match(authPagesSource, /\{busy \? "Ingresando\.\.\." : <>Ingresar <ArrowIcon \/><\/>\}/);
  assert.match(siteChromeSource, /<AppLink href="\/login">Ingresar<\/AppLink>/);
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
  const registerSource = readFileSync(new URL("../src/pages/RegisterPage.jsx", import.meta.url), "utf8");
  const privacySource = readFileSync(new URL("../src/pages/PrivacyPage.jsx", import.meta.url), "utf8");
  const siteChromeSource = readFileSync(new URL("../src/components/SiteChrome.jsx", import.meta.url), "utf8");
  const termsSource = readFileSync(new URL("../src/pages/TermsPage.jsx", import.meta.url), "utf8");

  assert.match(appSource, /TermsPage/);
  assert.match(appSource, /pathname === "\/terms"/);
  assert.match(siteChromeSource, /href="\/terms">Terminos/);
  assert.match(registerSource, /Acepto los/);
  assert.match(registerSource, /href="\/terms"/);
  assert.match(registerSource, /href="\/privacy"/);
  assert.match(privacySource, /href="\/terms"/);
  assert.match(termsSource, /Terminos y Condiciones/);
  assert.match(termsSource, /Vigente desde el 7 de agosto de 2026/);
  assert.match(termsSource, /Marcelo Gabriel Gonzalez/);
  assert.match(termsSource, /bookia.app.admin@gmail.com/);
  assert.match(termsSource, /Bookia no vende libros directamente/);
  assert.match(termsSource, /operacion comercial se acuerda directamente entre la persona interesada y la libreria/);
  assert.match(termsSource, /OpenAI/);
  assert.match(termsSource, /Mercado Pago/);
  assert.match(termsSource, /correo distinto del correo de acceso a Bookia/);
  assert.match(privacySource, /correo de la cuenta pagadora de Mercado Pago/);
  assert.match(privacySource, /limite temporal en memoria/);
  assert.match(termsSource, /prueba gratis de 30 dias/);
  assert.match(termsSource, /7 dias/);
  assert.match(termsSource, /oculta la vidriera y el catalogo publico/);
  assert.match(termsSource, /reactivar la suscripcion desde su panel/);
  assert.match(termsSource, /no incluye una nueva prueba gratis/);
  assert.match(termsSource, /Politica de Privacidad/);
  assert.match(termsSource, /Politica de Cookies/);
  assert.match(termsSource, /no reemplaza asesoramiento legal profesional/);
}], ["offers paid reactivation for canceled hidden bookstores", () => {
  const billingPanelSource = readFileSync(new URL("../src/components/BillingSubscriptionPanel.jsx", import.meta.url), "utf8");
  const dashboardSource = readFileSync(new URL("../src/pages/DashboardPage.jsx", import.meta.url), "utf8");
  const editorialStyles = readFileSync(new URL("../src/editorial.css", import.meta.url), "utf8");

  assert.match(billingPanelSource, /\/billing\/subscription\/reactivate/);
  assert.match(billingPanelSource, /Reactivar librería/);
  assert.match(billingPanelSource, /sin una nueva prueba gratis/);
  assert.match(billingPanelSource, /volverá a publicarse cuando Mercado Pago confirme la autorización/);
  assert.match(dashboardSource, /billingAccess\.catalogIsPublic/);
  assert.match(dashboardSource, /Tu librería y su catálogo no están visibles públicamente/);
  assert.match(dashboardSource, /Vidriera oculta/);
  assert.match(dashboardSource, /La reactivación está pendiente\. Confirmá el medio de pago desde Suscripción\./);
  assert.match(billingPanelSource, /Finalizó el/);
  assert.match(billingPanelSource, /Inicio de facturación/);
  assert.match(editorialStyles, /\.billing-change-form \.billing-notice/);
  assert.match(editorialStyles, /grid-column: 1 \/ -1/);
}]);
tests.push(["renders the visual pricing composition with catalog growth band", () => {
  const publicPagesSource = readFileSync(new URL("../src/pages/PublicPages.jsx", import.meta.url), "utf8");
  const editorialStyles = readFileSync(new URL("../src/editorial.css", import.meta.url), "utf8");
  assert.match(publicPagesSource, /plans-hero-art/);
  assert.match(publicPagesSource, /plans-featured/);
  assert.match(publicPagesSource, /plans-growth-band/);
  assert.match(publicPagesSource, /Adicionales de catalogo/);
  assert.match(publicPagesSource, /<BookIcon size=\{54\} \/>/);
  assert.doesNotMatch(publicPagesSource, /\\u25A5/);
  assert.match(editorialStyles, /\.plans-pricing/);
  assert.match(editorialStyles, /\.plans-growth-band/);
  assert.doesNotMatch(publicPagesSource, /plans-cta/);
  assert.doesNotMatch(editorialStyles, /\.plans-cta/);
  assert.match(editorialStyles, /\.plans-hero-art/);
  assert.doesNotMatch(editorialStyles, /\.plans-hero-art \{[^}]*background: var\(--forest-deep\)/);
}]);
tests.push(["adds direct contact channels to the site footer", () => {
  const siteChromeSource = readFileSync(new URL("../src/components/SiteChrome.jsx", import.meta.url), "utf8");
  const editorialStyles = readFileSync(new URL("../src/editorial.css", import.meta.url), "utf8");

  assert.match(siteChromeSource, /className="footer-contact"/);
  assert.match(siteChromeSource, /<nav className="footer-links"[\s\S]*?<\/nav>\s*<section className="footer-contact"/);
  assert.match(siteChromeSource, /href="mailto:bookia\.app\.admin@gmail\.com"/);
  assert.match(siteChromeSource, />Informar un problema<\/a>/);
  assert.match(siteChromeSource, /href="mailto:bookia\.app\.admin@gmail\.com\?subject=Reporte%20o%20comentario%20sobre%20Bookia"/);
  assert.match(siteChromeSource, /href="https:\/\/wa\.me\/5491162366344"/);
  assert.match(siteChromeSource, /href="https:\/\/www\.instagram\.com\/bookia_app\?igsh=MWRveTNhanV4Y3J4eg=="/);
  assert.match(siteChromeSource, /target="_blank"/);
  assert.match(siteChromeSource, /rel="noreferrer"/);
  assert.match(editorialStyles, /\.footer-contact\s*\{/);
  assert.match(editorialStyles, /@media \(max-width: 620px\)[\s\S]*?\.footer-inner\s*\{[\s\S]*?grid-template-columns:\s*1fr;/);
}]);

tests.push(["shows Bookia's copyright notice beneath the footer description", () => {
  const siteChromeSource = readFileSync(new URL("../src/components/SiteChrome.jsx", import.meta.url), "utf8");

  assert.match(
    siteChromeSource,
    /Libros, librerias y lectores mas cerca\.<\/p>[\s\S]*?<p className="footer-copyright">© 2026 Bookia\. Todos los derechos reservados\.<\/p>/,
  );
}]);
tests.push(["shows a non-interactive Mercado Pago subscriptions badge in the footer", () => {
  const siteChromeSource = readFileSync(new URL("../src/components/SiteChrome.jsx", import.meta.url), "utf8");
  const editorialStyles = readFileSync(new URL("../src/editorial.css", import.meta.url), "utf8");

  assert.match(siteChromeSource, /className="footer-payment-badge"/);
  assert.match(siteChromeSource, /src="\/images\/mercado-pago-logo\.svg"/);
  assert.match(siteChromeSource, /alt="Mercado Pago"/);
  assert.match(siteChromeSource, /Suscripciones con Mercado Pago/);
  assert.match(siteChromeSource, /<div className="footer-payment-badge">\s*<img[^>]*>\s*<span>Suscripciones con Mercado Pago<\/span>\s*<\/div>/);
  assert.match(editorialStyles, /\.footer-payment-badge\s*\{/);
  assert.match(editorialStyles, /\.footer-payment-badge img\s*\{/);
}]);
tests.push(["presents a dual-path bookstore acquisition page without public pricing", () => {
  const publicPagesSource = readFileSync(new URL("../src/pages/PublicPages.jsx", import.meta.url), "utf8");
  const bookstoresPageSource = publicPagesSource.match(/export function BookstoresPage\(\) \{([\s\S]*?)\r?\n\}\r?\nfunction PlansPlan/);

  assert.ok(bookstoresPageSource, "BookstoresPage should remain isolated before PlansPlan");
  const page = bookstoresPageSource[1];
  assert.match(page, /Tu catálogo, frente a lectores que buscan qué leer/);
  assert.match(page, /Llegá a lectores que ya están buscando/);
  assert.match(page, /Publicá y mantené tu catálogo al día/);
  assert.match(page, /Recibí consultas directas/);
  assert.match(page, /ASÍ FUNCIONA/);
  assert.match(page, /Bookia facilita el descubrimiento y el contacto/);
  assert.match(page, /Cargá tu catálogo sin sumar trabajo innecesario/);
  assert.match(page, /Carga desde foto/);
  assert.match(page, /Autocompletado con IA/);
  assert.match(page, /href="\/plans\?register=bookstore"/);
  assert.match(page, /https:\/\/wa\.me\/5491162366344\?text=/);
  assert.match(page, /target="_blank"/);
  assert.match(page, /rel="noopener noreferrer"/);
  assert.match(page, /trackAcquisitionEvent\("bookstore_trial_started"\)/);
  assert.match(page, /trackAcquisitionEvent\("bookstore_demo_requested"\)/);
  assert.match(page, /trackAcquisitionEvent\("bookstore_plans_opened"\)/);
  assert.doesNotMatch(page, /ARS|\$\s*\d|\/mes/);
}]);
tests.push(["composes the bookstore acquisition page around a responsive editorial library image and conversion hierarchy", () => {
  const publicPagesSource = readFileSync(new URL("../src/pages/PublicPages.jsx", import.meta.url), "utf8");
  const editorialStyles = readFileSync(new URL("../src/editorial.css", import.meta.url), "utf8");

  assert.match(publicPagesSource, /className="bookstores-hero-copy"/);
  assert.match(publicPagesSource, /className="bookstores-hero-image" src="\/images\/bookstores-hero-library\.png" alt=""/);
  assert.match(publicPagesSource, /className="bookstores-benefit-grid"/);
  assert.match(editorialStyles, /\.bookstores-hero\s*\{[^}]*grid-template-columns:\s*minmax\(0,\s*1\.08fr\) minmax\(320px,\s*\.72fr\);/s);
  assert.match(editorialStyles, /\.bookstores-hero-image\s*\{[^}]*object-fit:\s*cover;/s);
  assert.doesNotMatch(editorialStyles, /\.bookstores-hero-art\s*\{[^}]*transform:\s*rotate\(/s);
  assert.match(editorialStyles, /\.bookstore-cta\s*\{/);
}]);
tests.push(["presents bookstore benefits as modern independent cards", () => {
  const editorialStyles = readFileSync(new URL("../src/editorial.css", import.meta.url), "utf8");

  assert.match(editorialStyles, /\.bookstores-section-heading\s*\{[^}]*grid-template-columns:\s*1fr;/s);
  assert.match(editorialStyles, /\.bookstores-benefit-grid\s*\{[^}]*gap:\s*18px;/s);
  assert.match(editorialStyles, /\.bookstores-benefit-grid article\s*\{[^}]*border-radius:\s*18px;/s);
}]);tests.push(["adds a gap only before the bookstore benefits strip", () => {
  const publicPagesSource = readFileSync(new URL("../src/pages/PublicPages.jsx", import.meta.url), "utf8");
  const editorialStyles = readFileSync(new URL("../src/editorial.css", import.meta.url), "utf8");

  assert.match(publicPagesSource, /<BenefitsStrip className="bookstores-benefits-strip" benefits=\{BOOKSTORE_BENEFITS\}/);
  assert.match(editorialStyles, /\.bookstores-benefits-strip\s*\{[^}]*margin-top:\s*12px;/s);
}]);
tests.push(["adds a gap only before the reading-club benefits strip", () => {
  const publicPagesSource = readFileSync(new URL("../src/pages/PublicPages.jsx", import.meta.url), "utf8");
  const editorialStyles = readFileSync(new URL("../src/editorial.css", import.meta.url), "utf8");

  assert.match(publicPagesSource, /<BenefitsStrip className="reading-clubs-benefits-strip" benefits=\{READING_CLUB_BENEFITS\}/);
  assert.match(editorialStyles, /\.reading-clubs-benefits-strip\s*\{[^}]*margin-top:\s*12px;/s);
}]);
tests.push(["centers bookstore and reading-club illustrations at the mobile breakpoint", () => {
  const editorialStyles = readFileSync(new URL("../src/editorial.css", import.meta.url), "utf8");

  assert.match(editorialStyles, /@media \(max-width: 820px\)\s*\{[\s\S]*?\.bookstores-section-illustration,\s*\.reading-clubs-section-illustration\s*\{[^}]*align-self:\s*center;/);
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
