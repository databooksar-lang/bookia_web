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
    assert.match(dashboardSource, /hidden=\{section !==/);
    assert.doesNotMatch(dashboardSource, /isCreateOpen|isActiveOpen|isHiddenOpen|isReadingClubsOpen/);
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
}
