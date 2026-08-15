import assert from "node:assert/strict";

import { readFileSync } from "node:fs";

import {
  buildReaderProfileUrl,
  parseReaderProfileNavigation,
} from "../src/readerProfileNavigationState.js";

export function registerReaderProfileNavigationStateTests(test) {
  test("defaults reader profile navigation to the info section", () => {
    assert.equal(parseReaderProfileNavigation("").section, "info");
  });

  test("accepts the favorites reader profile section", () => {
    assert.equal(parseReaderProfileNavigation("?section=favorites").section, "favorites");
  });

  test("accepts the wanted-books reader profile section", () => {
    assert.equal(parseReaderProfileNavigation("?section=wanted").section, "wanted");
  });

  test("normalizes invalid reader profile sections to info", () => {
    assert.equal(parseReaderProfileNavigation("?section=clubs").section, "info");
  });

  test("builds canonical reader profile URLs", () => {
    assert.equal(buildReaderProfileUrl("info"), "/profile?section=info");
    assert.equal(buildReaderProfileUrl("favorites"), "/profile?section=favorites");
    assert.equal(buildReaderProfileUrl("wanted"), "/profile?section=wanted");
  });

  test("connects reader profile URL navigation to accessible tab panels", () => {
    const appSource = readFileSync(new URL("../src/App.jsx", import.meta.url), "utf8");
    const profileSource = readFileSync(new URL("../src/pages/ReaderProfilePage.jsx", import.meta.url), "utf8");
    const editorialSource = readFileSync(new URL("../src/editorial.css", import.meta.url), "utf8");

    assert.match(appSource, /<ReaderProfilePage[^>]*locationSearch=\{search\}/);
    assert.match(profileSource, /parseReaderProfileNavigation\(locationSearch\)/);
    assert.match(profileSource, /Mi info/);
    assert.match(profileSource, /Mis favoritos/);
    assert.match(profileSource, /📝 Mi info/);
    assert.match(profileSource, /❤️ Mis favoritos/);
    assert.match(profileSource, /🔎 Libros buscados/);
    assert.match(profileSource, /reader-public-profile-button/);
    assert.match(profileSource, /aria-label="Secciones de mi perfil"/);
    assert.match(profileSource, /hidden=\{section !== "info"\}/);
    assert.match(profileSource, /hidden=\{section !== "favorites"\}/);
    assert.match(editorialSource, /\.reader-profile-tab-panel\[hidden\]/);
  });

  test("groups reader profile editing, saved items, and wanted books into editorial blocks", () => {
    const profileSource = readFileSync(new URL("../src/pages/ReaderProfilePage.jsx", import.meta.url), "utf8");
    const editorialSource = readFileSync(new URL("../src/editorial.css", import.meta.url), "utf8");

    assert.match(profileSource, /reader-profile-content-block reader-profile-information-block/);
    assert.match(profileSource, /reader-profile-content-block reader-profile-genres-block/);
    assert.match(profileSource, /reader-profile-content-block reader-profile-passport-block/);
    assert.match(profileSource, /reader-profile-content-block reader-profile-favorites-block/);
    assert.match(profileSource, /reader-profile-content-block reader-profile-followed-block/);
    assert.match(profileSource, /reader-profile-content-block reader-profile-wanted-editor/);
    assert.match(profileSource, /reader-profile-content-block reader-profile-wanted-list/);
    assert.match(editorialSource, /\.reader-profile-content-block\s*\{/);
    assert.match(editorialSource, /\.reader-profile-passport-block\s+\.reader-passport-editor-group\s*\{/);
  });
}
