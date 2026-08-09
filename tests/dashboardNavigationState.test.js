import assert from "node:assert/strict";

import { readFileSync } from 'node:fs';

import {
  buildDashboardUrl,
  parseDashboardNavigation,
} from "../src/dashboardNavigationState.js";

export function registerDashboardNavigationStateTests(test) {
  test("defaults dashboard navigation to the profile section", () => {
    assert.deepEqual(parseDashboardNavigation(""), {
      section: "profile",
      catalogView: "active",
    });
  });

  test("accepts every supported dashboard section", () => {
    assert.equal(parseDashboardNavigation("?section=profile").section, "profile");
    assert.equal(parseDashboardNavigation("?section=new-book").section, "new-book");
    assert.equal(parseDashboardNavigation("?section=catalog").section, "catalog");
    assert.equal(parseDashboardNavigation("?section=clubs").section, "clubs");
    assert.equal(parseDashboardNavigation("?section=metrics").section, "metrics");
    assert.equal(parseDashboardNavigation("?section=subscription").section, "subscription");
  });

  test("accepts active and sold-out catalog views", () => {
    assert.equal(parseDashboardNavigation("?section=catalog&view=active").catalogView, "active");
    assert.equal(parseDashboardNavigation("?section=catalog&view=sold-out").catalogView, "sold-out");
  });

  test("normalizes invalid dashboard navigation values", () => {
    assert.deepEqual(parseDashboardNavigation("?section=unknown&view=archived"), {
      section: "profile",
      catalogView: "active",
    });
    assert.deepEqual(parseDashboardNavigation("?section=catalog&view=archived"), {
      section: "catalog",
      catalogView: "active",
    });
  });

  test("builds canonical dashboard URLs", () => {
    assert.equal(buildDashboardUrl("profile"), "/dashboard?section=profile");
    assert.equal(buildDashboardUrl("new-book"), "/dashboard?section=new-book");
    assert.equal(buildDashboardUrl("clubs"), "/dashboard?section=clubs");
    assert.equal(buildDashboardUrl("metrics"), "/dashboard?section=metrics");
    assert.equal(buildDashboardUrl("catalog"), "/dashboard?section=catalog&view=active");
    assert.equal(buildDashboardUrl("catalog", "sold-out"), "/dashboard?section=catalog&view=sold-out");
  });
  test('connects URL navigation to mounted dashboard panels', () => {
    const appSource = readFileSync(new URL('../src/App.jsx', import.meta.url), 'utf8');
    const dashboardSource = readFileSync(new URL('../src/pages/DashboardPage.jsx', import.meta.url), 'utf8');

    assert.match(appSource, /<DashboardPage[^>]*locationSearch=\{search\}/);
    assert.match(dashboardSource, /parseDashboardNavigation\(locationSearch\)/);
    assert.match(dashboardSource, /className=.dashboard-tabs./);
    assert.match(dashboardSource, /Perfil/);
    assert.match(dashboardSource, /Alta de libros/);
    assert.match(dashboardSource, /Cat.logo activo/);
    assert.match(dashboardSource, /Agotados/);
    assert.match(dashboardSource, /Clubes de lectura/);
    assert.match(dashboardSource, /Metricas/);
    assert.match(dashboardSource, /label: .Perfil., emoji: .👤./);
    assert.match(dashboardSource, /label: .Alta de libros., emoji: .➕./);
    assert.match(dashboardSource, /label: .Catalogo., emoji: .📚./);
    assert.match(dashboardSource, /label: .Clubes de lectura., emoji: .📖./);
    assert.match(dashboardSource, /label: .Metricas., emoji: .📊./);
    assert.match(dashboardSource, /label: .Suscripcion., emoji: .💳./);
    assert.match(dashboardSource, /aria-hidden=.true./);
    assert.match(dashboardSource, /\/dashboard\/analytics/);
    assert.match(dashboardSource, /hidden=\{section !==/);
    assert.doesNotMatch(dashboardSource, /isCreateOpen|isActiveOpen|isHiddenOpen|isReadingClubsOpen/);
  });

  test('highlights the public storefront action in the dashboard header', () => {
    const dashboardSource = readFileSync(new URL('../src/pages/DashboardPage.jsx', import.meta.url), 'utf8');

    assert.match(dashboardSource, /className="primary-button" onClick=\{\(\) => navigate\(`\/bookstores\/\$\{me\.bookstore\.slug\}`\)\}>🏬 Ver vidriera digital <ArrowIcon \/>/);
  });

  test('offers the Telegram bot from the dashboard header with safe external navigation', () => {
    const dashboardSource = readFileSync(new URL('../src/pages/DashboardPage.jsx', import.meta.url), 'utf8');

    assert.match(dashboardSource, /href="https:\/\/t\.me\/bookia_ext_bot"/);
    assert.match(dashboardSource, /target="_blank"/);
    assert.match(dashboardSource, /rel="noreferrer"/);
    assert.match(dashboardSource, /🤖 Usar bot de Telegram/);
    assert.match(dashboardSource, /Iniciá sesión en el bot con el correo y la contraseña de tu librería para cargar libros desde Telegram\./);
  });

  test('opens the unfiltered active catalog after creating a book', () => {
    const dashboardSource = readFileSync(new URL('../src/pages/DashboardPage.jsx', import.meta.url), 'utf8');

    assert.match(dashboardSource, /setTitleQuery\([^)]*\)/);
    assert.match(dashboardSource, /setAuthorQuery\([^)]*\)/);
    assert.match(dashboardSource, /loadCatalog\(\{\s*title:\s*..,\s*author:\s*..\s*\}\)/);
    assert.match(dashboardSource, /navigate\(buildDashboardUrl\(.catalog.,\s*.active.\)\)/);
  });
  test('styles dashboard tabs for responsive and keyboard navigation', () => {
    const editorialSource = readFileSync(new URL('../src/editorial.css', import.meta.url), 'utf8');

    assert.match(editorialSource, /\.dashboard-tabs\s*\{[^}]*overflow-x:\s*auto;/s);
    assert.match(editorialSource, /\.dashboard-tab\s*\{[^}]*min-height:\s*44px;/s);
    assert.match(editorialSource, /\.dashboard-tab\.is-active\s*\{[^}]*background:\s*var\(--forest\);/s);
    assert.match(editorialSource, /\.dashboard-subtab\.is-active/);
    assert.match(editorialSource, /\.dashboard-tab:focus-visible/);
  });

  test('styles the active catalog search with botanical fields and a rectangular filter button', () => {
    const editorialSource = readFileSync(new URL('../src/editorial.css', import.meta.url), 'utf8');

    assert.match(editorialSource, /\.dashboard-search\s*\{[^}]*background:\s*#e3eee8;[^}]*border:\s*1px solid #a8c5b5;/s);
    assert.match(editorialSource, /\.dashboard-search-field > input,[\s\S]*?\.dashboard-search \.input-with-icon\s*\{[^}]*background:\s*#fffdf8;[^}]*border:\s*1px solid #a8c5b5;/s);
    assert.match(editorialSource, /\.dashboard-search button\s*\{[^}]*background:\s*var\(--forest\);[^}]*border-radius:\s*7px;/s);
    assert.match(editorialSource, /\.dashboard-search button:hover\s*\{[^}]*background:\s*var\(--forest-deep\);/s);
  });
}
