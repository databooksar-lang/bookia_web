import assert from "node:assert/strict";

import { createLatestBillingRequestGuard, loadBillingSubscription } from "../src/billingSubscriptionState.js";

export function registerBillingSubscriptionStateTests(test) {
  test("returns the billing response when the subscription request succeeds", async () => {
    const billing = { status: "active", plan_code: "base" };
    let clearedTimer = null;

    const result = await loadBillingSubscription(
      () => Promise.resolve(billing),
      { setTimeoutFn: () => 42, clearTimeoutFn: (timer) => { clearedTimer = timer; } },
    );

    assert.equal(result, billing);
    assert.equal(clearedTimer, 42);
  });

  test("preserves an API error so the panel can display it", async () => {
    await assert.rejects(
      () => loadBillingSubscription(() => Promise.reject(new Error("La API respondio 404."))),
      /La API respondio 404\./,
    );
  });

  test("preserves a 503 API error so the panel can display it", async () => {
    await assert.rejects(
      () => loadBillingSubscription(() => Promise.reject(new Error("La API respondio 503."))),
      /La API respondio 503\./,
    );
  });

  test("preserves a network error so the panel can display it", async () => {
    await assert.rejects(
      () => loadBillingSubscription(() => Promise.reject(new Error("No pudimos conectar con el servidor."))),
      /No pudimos conectar con el servidor\./,
    );
  });

  test("rejects a stalled subscription request with a retryable timeout error", async () => {
    let requestSignal = null;

    await assert.rejects(
      () => loadBillingSubscription(
        ({ signal }) => {
          requestSignal = signal;
          return new Promise(() => {});
        },
        { setTimeoutFn: (callback) => { callback(); return 7; }, clearTimeoutFn: () => {} },
      ),
      /tardo demasiado.*Reintenta/i,
    );

    assert.equal(requestSignal.aborted, true);
  });

  test("invalidates an older billing request after a newer request starts", () => {
    const requestGuard = createLatestBillingRequestGuard();
    const firstRequest = requestGuard.begin();
    const secondRequest = requestGuard.begin();

    assert.equal(requestGuard.isCurrent(firstRequest), false);
    assert.equal(requestGuard.isCurrent(secondRequest), true);
    requestGuard.invalidate();
    assert.equal(requestGuard.isCurrent(secondRequest), false);
  });
}
