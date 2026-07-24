export function getRegisterStep({ profileType, email, password }) {
  if (profileType !== "bookstore") return "form";
  return email && password.length >= 8 ? "details" : "account";
}

export function buildRegistrationRequest({
  profileType,
  email,
  password,
  displayName,
  bookstoreName,
  planCode,
  catalogLimit,
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
      plan_code: planCode,
      catalog_limit: Number(catalogLimit),
      privacy_accepted: privacyAccepted,
    },
  };
}
