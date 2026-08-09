const EMPTY_DESCRIPTION = "Sin descripción";

export function displayBookstoreDescription(value) {
  const description = typeof value === "string" ? value.trim() : "";
  return description || EMPTY_DESCRIPTION;
}

export function getBookstoreTagOptions(genres = [], value = "", otherValue = "") {
  const selectedValue = typeof value === "string" ? value.trim() : "";
  const excludedValue = typeof otherValue === "string" ? otherValue.trim() : "";
  const activeOptions = genres
    .map((genre) => typeof genre?.name === "string" ? genre.name.trim() : "")
    .filter((name) => name && (name !== excludedValue || name === selectedValue))
    .map((name) => ({ value: name, label: name }));

  if (selectedValue && !activeOptions.some((option) => option.value === selectedValue)) {
    return [{ value: selectedValue, label: `${selectedValue} (ya no disponible)` }, ...activeOptions];
  }

  return activeOptions;
}

export function requireRefreshedBookstore(result) {
  if (!result?.bookstore) {
    throw new Error("No pudimos actualizar los datos de la librer\u00eda.");
  }

  return result.bookstore;
}

export function createProfileDraft(bookstore = {}) {
  const whatsappPhone = bookstore.whatsapp_phone ?? "";
  return {
    description: bookstore.description ?? "",
    tag1: bookstore.tag_1 ?? "",
    tag2: bookstore.tag_2 ?? "",
    address: bookstore.address ?? "",
    contactEmail: bookstore.correo ?? "",
    whatsappPhone,
    instagramHandle: bookstore.instagram_handle ?? "",
    facebookHandle: bookstore.facebook_handle ?? "",
    websiteUrl: bookstore.website_url ?? "",
    logoFile: null,
    bannerFile: null,
    removeLogo: false,
    removeBanner: false,
  };
}

export function setProfileDraftField(draft, field, value) {
  return { ...draft, [field]: value };
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
