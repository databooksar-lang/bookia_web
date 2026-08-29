import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { formatImportedCommerce, getTiendanubeCallbackMessage, getTiendanubeViewState } from "../src/tiendanubeIntegrationState.js";

const dashboardSource = readFileSync(new URL("../src/pages/DashboardPage.jsx", import.meta.url), "utf8");
const panelSource = readFileSync(new URL("../src/components/TiendanubeIntegrationPanel.jsx", import.meta.url), "utf8");
const publicPagesSource = readFileSync(new URL("../src/pages/PublicPages.jsx", import.meta.url), "utf8");
const privacySource = readFileSync(new URL("../src/pages/PrivacyPage.jsx", import.meta.url), "utf8");
const termsSource = readFileSync(new URL("../src/pages/TermsPage.jsx", import.meta.url), "utf8");
const cookiesSource = readFileSync(new URL("../src/pages/CookiePolicyPage.jsx", import.meta.url), "utf8");

export function registerTiendanubeIntegrationStateTests(test) {
  test("normalizes Tiendanube connection states", () => {
    assert.equal(getTiendanubeViewState(null).kind, "disconnected");
    assert.equal(getTiendanubeViewState({ connected: true, status: "connected" }).kind, "connected");
    assert.equal(getTiendanubeViewState({ connected: true, status: "partial" }).kind, "partial");
    assert.equal(getTiendanubeViewState({ connected: true, status: "reconnect_required" }).kind, "reconnect_required");
  });

  test("formats Tiendanube price and stock without inventing inventory", () => {
    assert.deepEqual(formatImportedCommerce({ price: "15990.50", currency: "ARS", stock: 4 }), { price: "$ 15.990,50", stock: "4 en stock" });
    assert.equal(formatImportedCommerce({ price: null, stock: null }).stock, "Stock no gestionado");
  });

  test("maps OAuth callback results to useful feedback", () => {
    assert.match(getTiendanubeCallbackMessage("success"), /conectada/i);
    assert.match(getTiendanubeCallbackMessage("connected"), /conectada/i);
    assert.match(getTiendanubeCallbackMessage("partial"), /algunos/i);
    assert.match(getTiendanubeCallbackMessage("invalid"), /no pudimos validar/i);
    assert.match(getTiendanubeCallbackMessage("billing_required"), /suscripción/i);
  });

  test("connects dashboard navigation and protected integration actions", () => {
    assert.match(dashboardSource, /section: "integrations", label: "Integraciones"/);
    assert.match(dashboardSource, /<TiendanubeIntegrationPanel/);
    assert.match(panelSource, /apiFetch\("\/integrations\/tiendanube\/sync", \{ method: "POST" \}\)/);
    assert.match(panelSource, /apiFetch\("\/integrations\/tiendanube", \{ method: "DELETE" \}\)/);
    assert.match(panelSource, /Sincronizando…/);
    assert.match(panelSource, /reconnect_required/);
  });

  test("renders imported commerce in dashboard and public storefront", () => {
    assert.match(dashboardSource, /Origen: Tiendanube/);
    assert.match(publicPagesSource, /Comprar en Tiendanube/);
    assert.match(publicPagesSource, /formatImportedCommerce/);
  });

  test("documents Tiendanube data, external purchases, and temporary OAuth cookie", () => {
    assert.match(privacySource, /token de acceso cifrado/);
    assert.match(privacySource, /store\/redact/);
    assert.match(privacySource, /no solicita ni conserva datos de clientes o pedidos/i);
    assert.match(termsSource, /procesados por Tiendanube y la libreria/);
    assert.match(termsSource, /solicitud de privacidad validada/i);
    assert.match(cookiesSource, /bookia_tiendanube_oauth/);
  });
}
