import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("styles public and dashboard news cards responsively", () => {
  const styles = readFileSync(new URL("../src/editorial.css", import.meta.url), "utf8");

  assert.match(styles, /\.store-news\s*\{[^}]*padding:\s*80px 0 0;/s);
  assert.match(styles, /\.store-news-list\s*\{[^}]*grid-template-columns:\s*repeat\(3,\s*minmax\(0,\s*1fr\)\);/s);
  assert.match(styles, /\.store-news-image\s*\{[^}]*aspect-ratio:\s*16\s*\/\s*9;[^}]*object-fit:\s*cover;/s);
  assert.match(styles, /\.news-item-summary\s*\{[^}]*display:\s*grid;/s);
  assert.match(styles, /@media \(max-width: 820px\)\s*\{[\s\S]*?\.store-news-list\s*\{[^}]*grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\);/);
  assert.match(styles, /@media \(max-width: 620px\)\s*\{[\s\S]*?\.store-news-list\s*\{[^}]*grid-template-columns:\s*1fr;/);
});
