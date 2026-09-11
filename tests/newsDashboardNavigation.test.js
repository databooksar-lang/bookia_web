import assert from "node:assert/strict";
import test from "node:test";

import { buildDashboardUrl, parseDashboardNavigation } from "../src/dashboardNavigationState.js";

test("keeps the Novedades dashboard tab addressable and canonical", () => {
  assert.equal(parseDashboardNavigation("?section=news").section, "news");
  assert.equal(buildDashboardUrl("news"), "/dashboard?section=news");
});
