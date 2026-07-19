function normalizePhonePart(value) {
  if (value === null || value === undefined) {
    return "";
  }

  return String(value).replace(/\s+/g, "").trim();
}

function normalizeTextPart(value) {
  if (value === null || value === undefined) {
    return "";
  }

  return String(value).trim();
}

function normalizeSocialHandle(value, domainPattern) {
  return normalizeTextPart(value)
    .replace(domainPattern, "")
    .replace(/^@+/, "")
    .replace(/\/+$/, "");
}

export function buildWhatsAppHref(whatsappPhone, phoneCountryCd, phone) {
  const explicitWhatsApp = normalizePhonePart(whatsappPhone).replace(/\D/g, "");
  if (explicitWhatsApp) {
    return `https://wa.me/${explicitWhatsApp}`;
  }

  const normalizedCountry = normalizePhonePart(phoneCountryCd).replace(/\D/g, "");
  const normalizedPhone = normalizePhonePart(phone).replace(/\D/g, "");

  if (!normalizedCountry || !normalizedPhone) {
    return null;
  }

  return `https://wa.me/${normalizedCountry}${normalizedPhone}`;
}

export function formatDisplayPhone(phoneCountryCd, phone) {
  const normalizedCountry = normalizePhonePart(phoneCountryCd);
  const normalizedPhone = normalizePhonePart(phone);

  if (!normalizedCountry || !normalizedPhone) {
    return null;
  }

  return `+${normalizedCountry}${normalizedPhone}`;
}

export function buildInstagramHref(handle) {
  const normalizedHandle = normalizeSocialHandle(handle, /^https?:\/\/(www\.)?instagram\.com\//i);

  if (!normalizedHandle) {
    return null;
  }

  return `https://www.instagram.com/${normalizedHandle}/`;
}

export function buildFacebookHref(handle) {
  const normalizedHandle = normalizeSocialHandle(handle, /^https?:\/\/(www\.)?facebook\.com\//i);

  if (!normalizedHandle) {
    return null;
  }

  return `https://www.facebook.com/${normalizedHandle}`;
}

export function buildWebsiteHref(url) {
  const normalizedUrl = normalizeTextPart(url);

  if (!normalizedUrl) {
    return null;
  }

  if (/^https?:\/\//i.test(normalizedUrl)) {
    return normalizedUrl;
  }

  return `https://${normalizedUrl}`;
}

export function formatDisplayUrl(url) {
  const href = normalizeTextPart(url);

  if (!href) {
    return null;
  }

  return href.replace(/^https?:\/\//i, "").replace(/\/+$/, "");
}
