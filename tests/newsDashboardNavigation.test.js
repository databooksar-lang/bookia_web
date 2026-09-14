import assert from "node:assert/strict";

import { buildDashboardUrl, parseDashboardNavigation } from "../src/dashboardNavigationState.js";

export function registerNewsDashboardNavigationTests(test) {
test("keeps the Novedades dashboard tab addressable and canonical", () => {
  assert.equal(parseDashboardNavigation("?section=news").section, "news");
  assert.equal(buildDashboardUrl("news"), "/dashboard?section=news");
});
}
