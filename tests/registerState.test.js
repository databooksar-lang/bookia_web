import assert from "node:assert/strict";

import { buildRegistrationRequest, getRegisterStep } from "../src/registerState.js";
import * as registerState from "../src/registerState.js";

export function registerRegisterStateTests(test) {
  test("accepts only supported bookstore plans in registration query state", () => {
    assert.deepEqual(
      registerState.getRegisterQueryState("?profile=bookstore&plan=base"),
      { kind: "bookstore", profileType: "bookstore", planCode: "base" },
    );
    assert.deepEqual(
      registerState.getRegisterQueryState("?profile=bookstore&plan=plus_ai"),
      { kind: "bookstore", profileType: "bookstore", planCode: "plus_ai" },
    );
  });

  test("keeps reader registration free of plans", () => {
    assert.deepEqual(
      registerState.getRegisterQueryState("?profile=reader"),
      { kind: "reader", profileType: "reader", planCode: null },
    );
    assert.equal(registerState.buildRegisterPath({ profileType: "reader" }), "/register?profile=reader");
  });

  test("rejects malformed registration query combinations", () => {
    assert.deepEqual(registerState.getRegisterQueryState("?profile=bookstore"), { kind: "invalid" });
    assert.deepEqual(registerState.getRegisterQueryState("?profile=reader&plan=base"), { kind: "invalid" });
    assert.deepEqual(registerState.getRegisterQueryState("?profile=bookstore&plan=trial"), { kind: "invalid" });
    assert.deepEqual(registerState.getRegisterQueryState("?plan=base"), { kind: "invalid" });
    assert.equal(registerState.buildRegisterPath({ profileType: "bookstore", planCode: "base" }), "/register?profile=bookstore&plan=base");
  });

  test("allows plans only for the exact bookstore selection context", () => {
    assert.equal(registerState.isPlansRegistrationContext("?register=bookstore"), true);
    assert.equal(registerState.isPlansRegistrationContext("?register=reader"), false);
    assert.equal(registerState.isPlansRegistrationContext("?register=bookstore&preview=true"), false);
    assert.equal(registerState.isPlansRegistrationContext(""), false);
  });
  test("keeps bookstore registration on account details until credentials are complete", () => {
    assert.equal(getRegisterStep({ profileType: "bookstore", email: "", password: "" }), "account");
    assert.equal(getRegisterStep({ profileType: "bookstore", email: "libreria@example.com", password: "secreto123", whatsappPhone: "" }), "account");
    assert.equal(getRegisterStep({ profileType: "bookstore", email: "libreria@example.com", password: "secreto123", whatsappPhone: "11 2222-3333", bookstoreType: "" }), "account");
    assert.equal(getRegisterStep({ profileType: "bookstore", email: "libreria@example.com", password: "secreto123", whatsappPhone: "11 2222-3333", bookstoreType: "physical" }), "details");
  });

  test("builds reader registration payloads with author activation disabled by default", () => {
    assert.deepEqual(
      buildRegistrationRequest({ profileType: "reader", email: "lector@example.com", password: "secreto123", displayName: "Ana", privacyAccepted: true }),
      { path: "/auth/register/reader", body: { email: "lector@example.com", password: "secreto123", display_name: "Ana", is_author: false, author_rights_declaration_accepted: false, privacy_accepted: true } },
    );
  });

  test("builds reader registration payloads that activate an author profile", () => {
    assert.deepEqual(
      buildRegistrationRequest({ profileType: "reader", email: "autora@example.com", password: "secreto123", displayName: "Ana", isAuthor: true, authorRightsDeclarationAccepted: true, privacyAccepted: true }),
      { path: "/auth/register/reader", body: { email: "autora@example.com", password: "secreto123", display_name: "Ana", is_author: true, author_rights_declaration_accepted: true, privacy_accepted: true } },
    );
  });

  test("builds bookstore registration payloads for every catalog capacity", () => {
    for (const catalogLimit of ["50", "100", "200"]) {
      assert.deepEqual(
        buildRegistrationRequest({ profileType: "bookstore", email: "libreria@example.com", password: "secreto123", whatsappPhone: "11 2222-3333", bookstoreType: "hybrid", bookstoreName: "La Esquina", planCode: "plus_ai", catalogLimit, privacyAccepted: true }),
        { path: "/auth/register/bookstore", body: { name: "La Esquina", email: "libreria@example.com", password: "secreto123", whatsapp_phone: "11 2222-3333", bookstore_type: "hybrid", plan_code: "plus_ai", catalog_limit: Number(catalogLimit), privacy_accepted: true } },
      );
    }
  });

  test("sends the displayed monthly total so the backend can reject stale pricing", () => {
    const request = buildRegistrationRequest({
      profileType: "bookstore", email: "libreria@example.com", password: "secreto123", whatsappPhone: "11 2222-3333",
      bookstoreName: "La Esquina", planCode: "plus_ai", catalogLimit: "100",
      expectedMonthlyTotal: 35000, privacyAccepted: true,
    });
    assert.equal(request.body.expected_total_amount_ars, 35000);
  });

  test("keeps Mercado Pago payer details out of bookstore registration", () => {
    const request = buildRegistrationRequest({
      profileType: "bookstore", email: "owner@example.com", payerEmail: " Payments@Example.com ",
      password: "secreto123", whatsappPhone: "11 2222-3333", bookstoreName: "La Esquina", planCode: "base",
      catalogLimit: "50", privacyAccepted: true,
    });

    assert.equal("payer_email" in request.body, false);
  });
}
