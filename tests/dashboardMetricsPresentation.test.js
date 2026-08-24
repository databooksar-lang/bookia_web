import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";

import * as analyticsState from "../src/analyticsState.js";

export function registerDashboardMetricsPresentationTests(test) {
  test("classifies positive, negative and neutral metric changes", () => {
    assert.equal(typeof analyticsState.getMetricChangeTone, "function");
    assert.equal(analyticsState.getMetricChangeTone(4), "positive");
    assert.equal(analyticsState.getMetricChangeTone(-2), "negative");
    assert.equal(analyticsState.getMetricChangeTone(0), "neutral");
  });

  test("adds every supported sharing channel for ranking totals", () => {
    assert.equal(typeof analyticsState.sumShareChannels, "function");
    assert.equal(analyticsState.sumShareChannels({ whatsapp: 4, instagram: 3, telegram: 2, copy_link: 1 }), 10);
    assert.equal(analyticsState.sumShareChannels(), 0);
  });

  test("renders metrics as an editorial summary with semantic groups and rankings", () => {
    const componentUrl = new URL("../src/components/DashboardMetrics.jsx", import.meta.url);
    const dashboardSource = readFileSync(new URL("../src/pages/DashboardPage.jsx", import.meta.url), "utf8");

    assert.equal(existsSync(componentUrl), true);
    const componentSource = readFileSync(componentUrl, "utf8");
    assert.match(dashboardSource, /import DashboardMetrics from "\.\.\/components\/DashboardMetrics"/);
    assert.match(dashboardSource, /<DashboardMetrics analytics=\{analytics\} \/>/);
    assert.match(componentSource, /className="metrics-kpi-grid"/);
    assert.match(componentSource, /aria-label="Resumen principal de métricas"/);
    assert.match(componentSource, /title="Difusión"/);
    assert.match(componentSource, /title="Comunidad"/);
    assert.match(componentSource, /className="metrics-ranking-list"/);
    assert.match(componentSource, /Libros con más interés/);
    assert.match(componentSource, /Clubes más compartidos/);
  });

  test("styles four, two and one-column metric layouts without horizontal overflow", () => {
    const editorialStyles = readFileSync(new URL("../src/editorial.css", import.meta.url), "utf8");

    assert.match(editorialStyles, /\.metrics-kpi-grid\s*\{[^}]*grid-template-columns:\s*repeat\(4,\s*minmax\(0,\s*1fr\)\);/s);
    assert.match(editorialStyles, /\.metrics-kpi\.is-positive/);
    assert.match(editorialStyles, /\.metrics-kpi\.is-negative/);
    assert.match(editorialStyles, /\.metrics-kpi\.is-neutral/);
    assert.match(editorialStyles, /@media \(max-width:\s*980px\)[\s\S]*?\.metrics-kpi-grid\s*\{[^}]*grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\);/);
    assert.match(editorialStyles, /@media \(max-width:\s*620px\)[\s\S]*?\.metrics-kpi-grid\s*\{[^}]*grid-template-columns:\s*1fr;/);
    assert.match(editorialStyles, /\.metrics-ranking-item\s*\{[^}]*min-width:\s*0;/s);
  });
}
