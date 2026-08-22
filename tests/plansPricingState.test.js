import assert from "node:assert/strict";

import { formatCommercialPrice, getCommercialPrices } from "../src/plansPricingState.js";

const ACTIVE_PUBLIC_OFFER_ROWS = [
  { offering_code: "trial", amount_ars: 0 },
  { offering_code: "initial", amount_ars: 10000 },
  { offering_code: "base", amount_ars: 20000 },
  { offering_code: "catalog_100", amount_ars: 5000 },
  { offering_code: "catalog_200", amount_ars: 10000 },
];

const ACTIVE_PUBLIC_PRICES = { trial: 0, initial: 10000, base: 20000, catalog_100: 5000, catalog_200: 10000 };

export function registerPlansPricingStateTests(register) {
  register("uses a complete active public price response without a retired offer row", () => {
    const prices = getCommercialPrices(ACTIVE_PUBLIC_OFFER_ROWS);

    assert.deepEqual(prices, ACTIVE_PUBLIC_PRICES);
    assert.equal(formatCommercialPrice(prices.base), "ARS 20.000");
  });

  register("ignores a retired Plus AI row when active public prices are complete", () => {
    assert.deepEqual(
      getCommercialPrices([...ACTIVE_PUBLIC_OFFER_ROWS, { offering_code: "plus_ai", amount_ars: 30000 }]),
      ACTIVE_PUBLIC_PRICES,
    );
  });

  register("does not expose prices when the API response is incomplete", () => {
    assert.equal(getCommercialPrices([{ offering_code: "base", amount_ars: 20000 }]), null);
  });
}
