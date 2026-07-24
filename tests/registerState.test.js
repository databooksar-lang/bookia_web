import assert from "node:assert/strict";

import { buildRegistrationRequest, getRegisterStep } from "../src/registerState.js";

export function registerRegisterStateTests(test) {
  test("keeps bookstore registration on account details until credentials are complete", () => {
    assert.equal(getRegisterStep({ profileType: "bookstore", email: "", password: "" }), "account");
    assert.equal(getRegisterStep({ profileType: "bookstore", email: "libreria@example.com", password: "secreto123" }), "details");
  });

  test("builds the existing reader registration payload", () => {
    assert.deepEqual(
      buildRegistrationRequest({ profileType: "reader", email: "lector@example.com", password: "secreto123", displayName: "Ana", privacyAccepted: true }),
      { path: "/auth/register/reader", body: { email: "lector@example.com", password: "secreto123", display_name: "Ana", privacy_accepted: true } },
    );
  });

  test("builds the existing bookstore registration payload after the second step", () => {
    assert.deepEqual(
      buildRegistrationRequest({ profileType: "bookstore", email: "libreria@example.com", password: "secreto123", bookstoreName: "La Esquina", planCode: "plus_ai", catalogLimit: "100", privacyAccepted: true }),
      { path: "/auth/register/bookstore", body: { name: "La Esquina", email: "libreria@example.com", password: "secreto123", plan_code: "plus_ai", catalog_limit: 100, privacy_accepted: true } },
    );
  });
}
