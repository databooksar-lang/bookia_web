const BOOKSTORE_PLAN_CODES = new Set(["initial", "base", "plus_ai"]);
const BOOKSTORE_TYPES = new Set(["physical", "virtual", "hybrid"]);

export function isSupportedBookstorePlan(planCode) {
  return BOOKSTORE_PLAN_CODES.has(planCode);
}

export function isSupportedBookstoreType(bookstoreType) {
  return BOOKSTORE_TYPES.has(bookstoreType);
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

export function getRegisterStep({ profileType, email, password, whatsappPhone, bookstoreType }) {
  if (profileType !== "bookstore") return "form";
  return email && password.length >= 8 && whatsappPhone?.trim() && isSupportedBookstoreType(bookstoreType) ? "details" : "account";
}

export function buildRegistrationRequest({
  profileType,
  email,
  password,
  whatsappPhone,
  bookstoreType,
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
      password,
      whatsapp_phone: whatsappPhone.trim(),
      bookstore_type: bookstoreType,
      plan_code: planCode,
      catalog_limit: Number(catalogLimit),
      ...(Number.isInteger(expectedMonthlyTotal) ? { expected_total_amount_ars: expectedMonthlyTotal } : {}),
      privacy_accepted: privacyAccepted,
    },
  };
}
