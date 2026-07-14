const EMPTY_DESCRIPTION = "Sin descripción";

export function displayBookstoreDescription(value) {
  const description = typeof value === "string" ? value.trim() : "";
  return description || EMPTY_DESCRIPTION;
}

export function createProfileDraft(bookstore = {}) {
  return {
    description: bookstore.description ?? "",
    logoFile: null,
    bannerFile: null,
    removeLogo: false,
    removeBanner: false,
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
