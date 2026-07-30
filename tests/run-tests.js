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
import { registerReadingClubStateTests } from "./readingClubState.test.js";
import { registerAiAutocompleteStateTests } from "./aiAutocompleteState.test.js";
import { registerDashboardCatalogStateTests } from "./dashboardCatalogState.test.js";
import { registerPublicSearchStateTests } from "./publicSearchState.test.js";
import { registerPlansPricingStateTests } from "./plansPricingState.test.js";
import { registerAnalyticsStateTests } from "./analyticsState.test.js";
import { registerRegisterStateTests } from "./registerState.test.js";
import { registerReaderProfileStateTests } from "./readerProfileState.test.js";
import { registerReaderProfileNavigationStateTests } from "./readerProfileNavigationState.test.js";
import { registerFavoritesStateTests } from "./favoritesState.test.js";
import { registerAccountDestinationTests } from "./accountDestination.test.js";

import { registerDashboardNavigationStateTests } from './dashboardNavigationState.test.js';

const tests = [
  ["treats /genres as an API route", () => {
    assert.equal(isBookiaApiRoute("/reading-clubs?genre_slug=policial"), true);
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
registerReadingClubStateTests((name, fn) => tests.push([name, fn]));
registerAiAutocompleteStateTests((name, fn) => tests.push([name, fn]));
registerDashboardCatalogStateTests((name, fn) => tests.push([name, fn]));
registerPublicSearchStateTests((name, fn) => tests.push([name, fn]));
registerPlansPricingStateTests((name, fn) => tests.push([name, fn]));
registerAnalyticsStateTests((name, fn) => tests.push([name, fn]));
registerRegisterStateTests((name, fn) => tests.push([name, fn]));
registerDashboardNavigationStateTests((name, fn) => tests.push([name, fn]));
registerReaderProfileStateTests((name, fn) => tests.push([name, fn]));
registerReaderProfileNavigationStateTests((name, fn) => tests.push([name, fn]));
registerFavoritesStateTests((name, fn) => tests.push([name, fn]));
registerAccountDestinationTests((name, fn) => tests.push([name, fn]));

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
  assert.match(editorialStyles, /\.book-card > \.favorite-book-button\s*\{[^}]*width:\s*auto;/s);
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
  assert.match(authPagesSource, /href="\/register"/);
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
    const editorialStyles = readFileSync(new URL("../src/editorial.css", import.meta.url), "utf8");
    assert.match(editorialStyles, /\.register-password-field\s*\{[^}]*position:\s*relative;/s);
    assert.match(editorialStyles, /\.register-password-field input\s*\{[^}]*padding-right:\s*48px;/s);
    assert.match(editorialStyles, /\.register-password-toggle\s*\{[^}]*min-width:\s*44px;/s);
    assert.match(editorialStyles, /\.register-legal input\[type="checkbox"\]\s*\{[^}]*width:\s*14px;[^}]*height:\s*14px;/s);
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

  assert.match(publicPagesSource, /<p className="search-panel-heading">Buscar libros<\/p>/);
  assert.match(editorialStyles, /\.search-panel-heading\s*\{[^}]*grid-column:\s*1\s*\/\s*-1;/s);
  assert.match(publicPagesSource, /search-field-title/);
  assert.match(publicPagesSource, /search-field-author/);
  assert.match(publicPagesSource, /search-field-status/);
  assert.match(editorialStyles, /\.search-field-title\s*\{\s*grid-column:\s*span 7;/);
  assert.match(editorialStyles, /\.search-field-author\s*\{\s*grid-column:\s*span 5;/);
  assert.match(editorialStyles, /\.search-field-status\s*\{\s*grid-column:\s*span 4;/);
  assert.match(editorialStyles, /\.search-submit\s*\{[^}]*grid-column:\s*span 3;/s);
  assert.match(editorialStyles, /@media \(max-width: 1040px\)[\s\S]*?\.search-panel\s*\{\s*grid-template-columns:\s*repeat\(6,/);
  assert.match(editorialStyles, /@media \(max-width: 820px\)[\s\S]*?\.search-panel\s*\{\s*grid-template-columns:\s*1fr;/);
  assert.match(editorialStyles, /\.search-panel\s*\{[^}]*box-sizing:\s*border-box;/s);
  assert.match(editorialStyles, /\.search-panel \.search-field > input,[\s\S]*?box-sizing:\s*border-box;/);
}]);
tests.push(["keeps Buscar as the home page with Bookia's approved public-search copy", () => {
  const appSource = readFileSync(new URL("../src/App.jsx", import.meta.url), "utf8");
  const publicPagesSource = readFileSync(new URL("../src/pages/PublicPages.jsx", import.meta.url), "utf8");

  assert.match(appSource, /let page = <HomePage me=\{me\} \/>;/);
  assert.match(publicPagesSource, /ENCONTR\\u00C1 TU PR\\u00D3XIMA LECTURA/);
  assert.match(publicPagesSource, /Los libros que busc\\u00E1s, en un solo lugar\./);
  assert.match(publicPagesSource, /Consult\\u00E1 disponibilidad por WhatsApp/);
  assert.match(publicPagesSource, /Explora librerias, descubri catalogos reales y conectate con clubes de lectura\./);
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
  assert.match(publicPagesSource, /Encontr\\u00E1 tu pr\\u00F3ximo libro/);
  assert.match(publicPagesSource, /Eleg\\u00ED c\\u00F3mo quer\\u00E9s leer/);
  assert.match(publicPagesSource, /Consult\\u00E1 a la librer\\u00EDa/);
  assert.match(bookstoresSectionSource[1], /<BenefitsStrip(?: className="bookstores-benefits-strip")? benefits=\{BOOKSTORE_BENEFITS\} ariaLabel="Beneficios para librer\u00EDas" \/>/);
  assert.match(readingClubsSectionSource[1], /<BenefitsStrip(?: className="reading-clubs-benefits-strip")? benefits=\{READING_CLUB_BENEFITS\} ariaLabel="Beneficios de los clubes de lectura" \/>/);
  assert.match(publicPagesSource, /Comunidad lectora/);
  assert.match(publicPagesSource, /Lecturas compartidas/);
  assert.match(publicPagesSource, /Encuentros cercanos/);
}]);
tests.push(["separates the reader search and bookstore acquisition routes", () => {
  const appSource = readFileSync(new URL("../src/App.jsx", import.meta.url), "utf8");
  const headerSource = readFileSync(new URL("../src/components/SiteChrome.jsx", import.meta.url), "utf8");
  const publicPagesSource = readFileSync(new URL("../src/pages/PublicPages.jsx", import.meta.url), "utf8");

  assert.match(appSource, /pathname === "\/para-librerias"\) page = <BookstoresPage \/>;/);
  assert.match(headerSource, /\{ href: "\/", label: "Buscar" \}/);
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
  assert.match(registerSource, /register-trust/);
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
  assert.match(editorialStyles, /\.register-catalog-options/);
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
  assert.match(termsSource, /Vigente desde el 28 de julio de 2026/);
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
  assert.match(siteChromeSource, /href="https:\/\/wa\.me\/5491162366344"/);
  assert.match(siteChromeSource, /href="https:\/\/www\.instagram\.com\/bookia_app\?igsh=MWRveTNhanV4Y3J4eg=="/);
  assert.match(siteChromeSource, /target="_blank"/);
  assert.match(siteChromeSource, /rel="noreferrer"/);
  assert.match(editorialStyles, /\.footer-contact\s*\{/);
  assert.match(editorialStyles, /@media \(max-width: 620px\)[\s\S]*?\.footer-inner\s*\{[\s\S]*?grid-template-columns:\s*1fr;/);
}]);

tests.push(["presents bookstore plans and AI capabilities without public pricing", () => {
  const publicPagesSource = readFileSync(new URL("../src/pages/PublicPages.jsx", import.meta.url), "utf8");
  const bookstoresPageSource = publicPagesSource.match(/export function BookstoresPage\(\) \{([\s\S]*?)\n\}\nfunction PlansPlan/);

  assert.ok(bookstoresPageSource, "BookstoresPage should remain isolated before PlansPlan");
  const page = bookstoresPageSource[1];
  assert.match(page, /Lleg\\u00E1 a m\\u00E1s lectores/);
  assert.match(page, /Organiz\\u00E1 tu cat\\u00E1logo/);
  assert.match(page, /Consultas directas/);
  assert.match(page, /Planes que acompa\\u00F1an tu etapa/);
  assert.match(page, /Carga desde foto/);
  assert.match(page, /Autocompletado con IA/);
  assert.doesNotMatch(page, />Gesti\\u00F3n/);
  assert.match(page, /<li>\{"Vidriera digital atractiva"\}<\/li>/);
  assert.match(page, /href="\/register"/);
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
}]);for (const [name, fn] of tests) {
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
