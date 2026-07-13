import test from "node:test";
import assert from "node:assert/strict";

import { isBookiaApiRoute } from "../src/apiRoutes.js";

test("treats /genres as an API route", () => {
  assert.equal(isBookiaApiRoute("/genres"), true);
  assert.equal(isBookiaApiRoute("/genres?active=true"), true);
});

test("keeps non-api frontend routes out of API detection", () => {
  assert.equal(isBookiaApiRoute("/dashboard"), true);
  assert.equal(isBookiaApiRoute("/plans"), false);
});
