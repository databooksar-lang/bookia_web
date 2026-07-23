export function normalizeEditableAvailability(value) {
  if (value === "reserved") {
    return "reserved";
  }
  if (value === "hidden" || value === "sold_out") {
    return "hidden";
  }
  return "available";
}

export function normalizeBookStatus(value) {
  return value === "nuevo" || value === "usado" ? value : "usado";
}

export function buildCatalogSaveErrorMessage(message) {
  const detail = String(message || "").trim() || "No pudimos guardar los cambios del libro.";
  return `${detail} La sugerencia de IA sigue en el formulario para que puedas reintentar.`;
}

function normalizeCatalogText(value) {
  const normalized = String(value ?? "").trim();
  return normalized ? normalized.toLowerCase() : "";
}

function normalizeDescription(value) {
  return String(value ?? "").trim();
}

function normalizeGenreIds(values) {
  if (!Array.isArray(values)) {
    return [];
  }
  const ids = [];
  const seen = new Set();
  for (const value of values) {
    const id = Number(value);
    if (!Number.isInteger(id) || id <= 0 || seen.has(id)) {
      continue;
    }
    seen.add(id);
    ids.push(id);
  }
  return ids;
}

function areGenreIdsEqual(left, right) {
  const leftIds = normalizeGenreIds(left);
  const rightIds = normalizeGenreIds(right);
  return leftIds.length === rightIds.length && leftIds.every((id, index) => id === rightIds[index]);
}

function optionalValueForPayload(value) {
  return String(value ?? "").trim() ? value : null;
}

export function buildDraftFromCatalogItem(item) {
  return {
    title: item.title || "",
    author: item.author || "",
    publisher: item.publisher || "",
    language: item.language || "",
    description: item.description || "",
    genre_ids: item.genre_ids || [],
    book_status: normalizeBookStatus(item.book_status),
    availability_status: normalizeEditableAvailability(item.availability_status),
  };
}

export function buildCatalogItemUpdatePayload(originalItem, draftItem) {
  const payload = {};

  for (const field of ["title", "author"]) {
    if (normalizeCatalogText(draftItem[field]) !== normalizeCatalogText(originalItem[field])) {
      payload[field] = draftItem[field] ?? "";
    }
  }

  for (const field of ["publisher", "language"]) {
    if (normalizeCatalogText(draftItem[field]) !== normalizeCatalogText(originalItem[field])) {
      payload[field] = optionalValueForPayload(draftItem[field]);
    }
  }

  if (normalizeDescription(draftItem.description) !== normalizeDescription(originalItem.description)) {
    payload.description = optionalValueForPayload(draftItem.description);
  }

  if (!areGenreIdsEqual(originalItem.genre_ids, draftItem.genre_ids)) {
    payload.genre_ids = normalizeGenreIds(draftItem.genre_ids);
  }

  if (normalizeBookStatus(draftItem.book_status) !== normalizeBookStatus(originalItem.book_status)) {
    payload.book_status = normalizeBookStatus(draftItem.book_status);
  }

  return payload;
}

export function hasCatalogItemAvailabilityChanged(originalItem, draftItem) {
  return normalizeEditableAvailability(draftItem.availability_status) !== normalizeEditableAvailability(originalItem.availability_status);
}