import assert from "node:assert/strict";

import { formatCommercialPrice, getCommercialPrices } from "../src/plansPricingState.js";

export function registerPlansPricingStateTests(register) {
  register("uses the API values only when every commercial offer is present", () => {
    const prices = getCommercialPrices([
      { offering_code: "trial", amount_ars: 0 },
      { offering_code: "base", amount_ars: 20000 },
      { offering_code: "plus_ai", amount_ars: 30000 },
      { offering_code: "catalog_100", amount_ars: 5000 },
      { offering_code: "catalog_200", amount_ars: 10000 },
    ]);

    assert.deepEqual(prices, { trial: 0, base: 20000, plus_ai: 30000, catalog_100: 5000, catalog_200: 10000 });
    assert.equal(formatCommercialPrice(prices.base), "ARS 20.000");
  });

  register("does not expose prices when the API response is incomplete", () => {
    assert.equal(getCommercialPrices([{ offering_code: "base", amount_ars: 20000 }]), null);
  });
}