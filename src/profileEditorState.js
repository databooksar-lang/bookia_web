const EMPTY_DESCRIPTION = "Sin descripción";

const BOOKSTORE_TYPE_LABELS = {
  physical: "Libreria fisica",
  virtual: "Libreria virtual",
  hybrid: "Libreria fisica y virtual",
};

export function displayBookstoreType(value) {
  return BOOKSTORE_TYPE_LABELS[value] || "";
}

export function displayBookstoreDescription(value) {
  const description = typeof value === "string" ? value.trim() : "";
  return description || EMPTY_DESCRIPTION;
}

function normalizeDescriptionLink(value) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:" ? url.href : null;
  } catch {
    return null;
  }
}

export function formatDescriptionSelection(value, selectionStart, selectionEnd, format, linkUrl = "") {
  const source = typeof value === "string" ? value : "";
  const start = Math.max(0, Math.min(Number.isInteger(selectionStart) ? selectionStart : source.length, source.length));
  const end = Math.max(start, Math.min(Number.isInteger(selectionEnd) ? selectionEnd : start, source.length));
  const selected = source.slice(start, end);

  if (format === "unorderedList" || format === "orderedList") {
    const selectedLines = (selected || "Elemento de lista").split("\n");
    const replacement = selectedLines.map((line, index) => format === "unorderedList" ? `- ${line}` : `${index + 1}. ${line}`).join("\n");
    return { value: `${source.slice(0, start)}${replacement}${source.slice(end)}`, selectionStart: start, selectionEnd: start + replacement.length };
  }

  const text = selected || (format === "link" ? "enlace" : format === "bold" ? "texto en negrita" : "texto en cursiva");
  let replacement;
  let selectionOffset;
  if (format === "bold") {
    replacement = `**${text}**`;
    selectionOffset = 2;
  } else if (format === "italic") {
    replacement = `*${text}*`;
    selectionOffset = 1;
  } else if (format === "link") {
    const href = normalizeDescriptionLink(linkUrl);
    if (!href) return null;
    replacement = `[${text}](${href})`;
    selectionOffset = 1;
  } else {
    return null;
  }
  return { value: `${source.slice(0, start)}${replacement}${source.slice(end)}`, selectionStart: start + selectionOffset, selectionEnd: start + selectionOffset + text.length };
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
    bookstoreType: bookstore.bookstore_type ?? "",
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
  formData.append("bookstore_type", draft.bookstoreType);
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
