import test from "node:test";
import assert from "node:assert/strict";

import { isBookiaApiRoute } from "../src/apiRoutes.js";

test("treats /genres as an API route", () => {
  assert.equal(isBookiaApiRoute("/genres"), true);
  assert.equal(isBookiaApiRoute("/genres?active=true"), true);
});

test("keeps frontend routes out of API detection", () => {
  assert.equal(isBookiaApiRoute("/dashboard"), false);
  assert.equal(isBookiaApiRoute("/bookstores/eterna-cadencia"), false);
  assert.equal(isBookiaApiRoute("/plans"), false);
});

test("treats /api-prefixed calls as API routes", () => {
  assert.equal(isBookiaApiRoute("/api/me"), true);
  assert.equal(isBookiaApiRoute("/api/bookstores/eterna-cadencia"), true);
});
