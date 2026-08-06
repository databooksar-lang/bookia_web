import assert from "node:assert/strict";

import {
  buildBillingChangeRequest,
  getBillingAccessState,
  getBillingReturnState,
  getBillingStatusLabel,
} from "../src/billingState.js";

export function registerBillingStateTests(test) {
  test("maps billing lifecycle states to customer-facing labels", () => {
    assert.equal(getBillingStatusLabel("trialing"), "Prueba gratis activa");
    assert.equal(getBillingStatusLabel("grace_period"), "Pago pendiente");
    assert.equal(getBillingStatusLabel("restricted"), "Suscripción restringida");
  });

  test("allows catalog management only during entitled billing states", () => {
    assert.deepEqual(getBillingAccessState({ status: "active" }), { canManageCatalog: true, needsPayment: false });
    assert.deepEqual(getBillingAccessState({ status: "grace_period" }), { canManageCatalog: true, needsPayment: true });
    assert.deepEqual(getBillingAccessState({ status: "restricted" }), { canManageCatalog: false, needsPayment: true });
    assert.deepEqual(getBillingAccessState({ status: "payment_pending", trial_ends_at: "2099-01-01T00:00:00Z" }), { canManageCatalog: true, needsPayment: true });
    assert.deepEqual(getBillingAccessState(null), { canManageCatalog: true, needsPayment: false });
  });

  test("builds a validated next-renewal change request", () => {
    assert.deepEqual(buildBillingChangeRequest("base", "200"), { plan_code: "base", catalog_limit: 200 });
    assert.throws(() => buildBillingChangeRequest("trial", "50"), /plan/i);
  });

  test("recognizes Mercado Pago return outcomes", () => {
    assert.equal(getBillingReturnState("?status=authorized").kind, "syncing");
    assert.equal(getBillingReturnState("?status=failure").kind, "syncing");
    assert.equal(getBillingReturnState("?status=failure").reportedFailure, true);
  });
}
