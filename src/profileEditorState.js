const EMPTY_DESCRIPTION = "Sin descripción";

export function displayBookstoreDescription(value) {
  const description = typeof value === "string" ? value.trim() : "";
  return description || EMPTY_DESCRIPTION;
}

export function requireRefreshedBookstore(result) {
  if (!result?.bookstore) {
    throw new Error("No pudimos actualizar los datos de la librer\u00eda.");
  }

  return result.bookstore;
}

export function createProfileDraft(bookstore = {}) {
  const phoneCountryCd = bookstore.phone_country_cd == null ? "" : String(bookstore.phone_country_cd);
  const phone = bookstore.phone ?? "";
  const whatsappPhone = bookstore.whatsapp_phone ?? "";
  const derivedWhatsApp = buildWhatsAppFromPhone(phoneCountryCd, phone);
  return {
    description: bookstore.description ?? "",
    tag1: bookstore.tag_1 ?? "",
    tag2: bookstore.tag_2 ?? "",
    address: bookstore.address ?? "",
    contactEmail: bookstore.correo ?? "",
    phoneCountryCd,
    phone,
    whatsappPhone,
    instagramHandle: bookstore.instagram_handle ?? "",
    facebookHandle: bookstore.facebook_handle ?? "",
    websiteUrl: bookstore.website_url ?? "",
    usePhoneForWhatsApp: Boolean(whatsappPhone && derivedWhatsApp === whatsappPhone),
    logoFile: null,
    bannerFile: null,
    removeLogo: false,
    removeBanner: false,
  };
}

export function buildWhatsAppFromPhone(phoneCountryCd, phone) {
  const countryDigits = String(phoneCountryCd ?? "").replace(/\D/g, "");
  const phoneDigits = String(phone ?? "").replace(/\D/g, "");
  return countryDigits && phoneDigits ? `${countryDigits}${phoneDigits}` : "";
}

export function setProfileDraftField(draft, field, value) {
  const nextDraft = { ...draft, [field]: value };
  if (draft.usePhoneForWhatsApp && (field === "phoneCountryCd" || field === "phone")) {
    nextDraft.whatsappPhone = buildWhatsAppFromPhone(nextDraft.phoneCountryCd, nextDraft.phone);
  }
  if (field === "whatsappPhone") {
    nextDraft.usePhoneForWhatsApp = false;
  }
  return nextDraft;
}

export function setUsePhoneForWhatsApp(draft, enabled) {
  return {
    ...draft,
    usePhoneForWhatsApp: enabled,
    whatsappPhone: enabled ? buildWhatsAppFromPhone(draft.phoneCountryCd, draft.phone) : draft.whatsappPhone,
  };
}

export function selectProfileImage(draft, role, file) {
  if (role === "logo") {
    return { ...draft, logoFile: file, removeLogo: false };
  }
  return { ...draft, bannerFile: file, removeBanner: false };
}

export function removeProfileImage(draft, role) {
  if (role === "logo") {
    return { ...draft, logoFile: null, removeLogo: true };
  }
  return { ...draft, bannerFile: null, removeBanner: true };
}

export function buildProfileFormData(draft) {
  const formData = new FormData();
  formData.append("description", draft.description);
  formData.append("tag_1", draft.tag1);
  formData.append("tag_2", draft.tag2);
  formData.append("address", draft.address);
  formData.append("correo", draft.contactEmail);
  formData.append("phone_country_cd", draft.phoneCountryCd);
  formData.append("phone", draft.phone);
  formData.append("whatsapp_phone", draft.whatsappPhone);
  formData.append("instagram_handle", draft.instagramHandle);
  formData.append("facebook_handle", draft.facebookHandle);
  formData.append("website_url", draft.websiteUrl);
  formData.append("remove_logo", String(draft.removeLogo));
  formData.append("remove_banner", String(draft.removeBanner));

  if (draft.logoFile) {
    formData.append("logo", draft.logoFile);
  }
  if (draft.bannerFile) {
    formData.append("banner", draft.bannerFile);
  }

  return formData;
}
