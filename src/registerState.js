const BOOKSTORE_PLAN_CODES = new Set(["base", "plus_ai"]);

export function isSupportedBookstorePlan(planCode) {
  return BOOKSTORE_PLAN_CODES.has(planCode);
}

export function getRegisterQueryState(search) {
  const params = new URLSearchParams(search);
  const profileType = params.get("profile");
  const planCode = params.get("plan");

  if (params.size === 0) return { kind: "choice", profileType: null, planCode: null };
  if (params.size === 1 && profileType === "reader" && !planCode) return { kind: "reader", profileType: "reader", planCode: null };
  if (params.size === 2 && profileType === "bookstore" && isSupportedBookstorePlan(planCode)) {
    return { kind: "bookstore", profileType: "bookstore", planCode };
  }

  return { kind: "invalid" };
}

export function buildRegisterPath({ profileType, planCode }) {
  if (profileType === "reader") return "/register?profile=reader";
  if (profileType === "bookstore" && isSupportedBookstorePlan(planCode)) {
    return `/register?profile=bookstore&plan=${planCode}`;
  }
  return "/register";
}

export function isPlansRegistrationContext(search) {
  const params = new URLSearchParams(search);
  return params.size === 1 && params.get("register") === "bookstore";
}

export function getRegisterStep({ profileType, email, password }) {
  if (profileType !== "bookstore") return "form";
  return email && password.length >= 8 ? "details" : "account";
}

export function buildRegistrationRequest({
  profileType,
  email,
  payerEmail,
  password,
  displayName,
  bookstoreName,
  planCode,
  catalogLimit,
  expectedMonthlyTotal,
  privacyAccepted,
}) {
  if (profileType === "reader") {
    return {
      path: "/auth/register/reader",
      body: {
        email,
        password,
        display_name: displayName.trim() || undefined,
        privacy_accepted: privacyAccepted,
      },
    };
  }

  return {
    path: "/auth/register/bookstore",
    body: {
      name: bookstoreName,
      email,
      ...(payerEmail ? { payer_email: payerEmail.trim().toLowerCase() } : {}),
      password,
      plan_code: planCode,
      catalog_limit: Number(catalogLimit),
      ...(Number.isInteger(expectedMonthlyTotal) ? { expected_total_amount_ars: expectedMonthlyTotal } : {}),
      privacy_accepted: privacyAccepted,
    },
  };
}
