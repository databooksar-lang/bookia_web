function normalizePhonePart(value) {
  if (value === null || value === undefined) {
    return "";
  }

  return String(value).replace(/\s+/g, "").trim();
}

export function buildWhatsAppHref(phoneCountryCd, phone) {
  const normalizedCountry = normalizePhonePart(phoneCountryCd);
  const normalizedPhone = normalizePhonePart(phone);

  if (!normalizedCountry || !normalizedPhone) {
    return null;
  }

  return `https://wa.me/${normalizedCountry}${normalizedPhone}`;
}

export function formatDisplayPhone(phoneCountryCd, phone) {
  const normalizedCountry = normalizePhonePart(phoneCountryCd);
  const normalizedPhone = normalizePhonePart(phone);

  if (!normalizedCountry || !normalizedPhone) {
    return phone || "No disponible";
  }

  return `+${normalizedCountry}${normalizedPhone}`;
}
