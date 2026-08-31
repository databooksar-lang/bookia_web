import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import {
  formatNextGoogleSheetsSync,
  getGoogleSheetsCallbackMessage,
  getGoogleSheetsViewState,
} from "../src/googleSheetsIntegrationState.js";
import { getExternalCatalogPresentation, isExternalCatalogItem } from "../src/externalCatalogState.js";


const dashboardSource = readFileSync(new URL("../src/pages/DashboardPage.jsx", import.meta.url), "utf8");
const panelSource = readFileSync(new URL("../src/components/GoogleSheetsIntegrationPanel.jsx", import.meta.url), "utf8");
const privacySource = readFileSync(new URL("../src/pages/PrivacyPage.jsx", import.meta.url), "utf8");
const termsSource = readFileSync(new URL("../src/pages/TermsPage.jsx", import.meta.url), "utf8");
const cookiesSource = readFileSync(new URL("../src/pages/CookiePolicyPage.jsx", import.meta.url), "utf8");


export function registerGoogleSheetsIntegrationStateTests(test) {
  test("normalizes Google Sheets connection and callback states", () => {
    assert.equal(getGoogleSheetsViewState(null).kind, "disconnected");
    assert.equal(getGoogleSheetsViewState({ connected: true, status: "active" }).kind, "connected");
    assert.equal(getGoogleSheetsViewState({ connected: true, status: "reconnect_required" }).kind, "reconnect_required");
    assert.match(getGoogleSheetsCallbackMessage("success"), /conectada/i);
    assert.match(getGoogleSheetsCallbackMessage("invalid"), /validar/i);
    assert.match(getGoogleSheetsCallbackMessage("billing_required"), /suscripción/i);
  });

  test("formats the weekly execution in Argentina time", () => {
    const formatted = formatNextGoogleSheetsSync("2026-09-06T06:00:00Z");
    assert.match(formatted, /domingo/i);
    assert.match(formatted, /03:00/);
    assert.equal(formatNextGoogleSheetsSync(null), "Todavía no programada");
  });

  test("connects dashboard and protected Google Sheets actions", () => {
    assert.match(dashboardSource, /<GoogleSheetsIntegrationPanel/);
    assert.match(dashboardSource, /google_sheets/);
    assert.match(panelSource, /apiFetch\("\/integrations\/google-sheets\/connect"/);
    assert.match(panelSource, /apiFetch\("\/integrations\/google-sheets\/sync", \{ method: "POST" \}\)/);
    assert.match(panelSource, /apiFetch\("\/integrations\/google-sheets", \{ method: "DELETE" \}\)/);
    assert.match(panelSource, /Sincronizar ahora/);
    assert.match(panelSource, /domingos a las 03:00/);
  });

  test("presents Google Sheets commerce in dashboard and public catalog", () => {
    assert.equal(isExternalCatalogItem({ source: "google_sheets" }), true);
    assert.equal(isExternalCatalogItem({ source: null }), false);
    assert.deepEqual(getExternalCatalogPresentation({ source: "google_sheets" }), {
      sourceLabel: "Google Sheets",
      actionLabel: "Ver opción de compra",
    });
    assert.match(dashboardSource, /Origen: \{externalCatalog\.sourceLabel\}/);
    const publicPagesSource = readFileSync(new URL("../src/pages/PublicPages.jsx", import.meta.url), "utf8");
    assert.match(publicPagesSource, /externalCatalog\.actionLabel/);
  });

  test("documents Google Sheets access, encrypted tokens, schedule, and temporary cookie", () => {
    assert.match(privacySource, /Google Sheets/);
    assert.match(privacySource, /token de actualizacion cifrado/i);
    assert.match(privacySource, /sincronizacion semanal/i);
    assert.match(termsSource, /Google Sheets/);
    assert.match(termsSource, /filas? eliminadas?.*ocult/i);
    assert.match(cookiesSource, /bookia_google_sheets_oauth/);
  });
}
