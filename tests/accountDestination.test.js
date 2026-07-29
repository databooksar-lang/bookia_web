import assert from "node:assert/strict";

import { getAccountDestination } from "../src/accountDestination.js";

export function registerAccountDestinationTests(test) {
  test("sends reader accounts to their profile", () => {
    assert.equal(getAccountDestination({ reader_profile: { slug: "ana-lee" } }), "/profile");
  });

  test("keeps bookstore accounts on the dashboard", () => {
    assert.equal(getAccountDestination({ bookstore: { slug: "eterna-cadencia" } }), "/dashboard");
  });
}
