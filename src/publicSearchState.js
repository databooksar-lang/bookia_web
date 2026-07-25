function appendTrimmedParam(params, key, value) {
  if (typeof value === "string" && value.trim()) {
    params.set(key, value.trim());
  }
}

export function buildPublicSearchParams(filters = {}) {
  const params = new URLSearchParams();
  appendTrimmedParam(params, "title", filters.title);
  appendTrimmedParam(params, "author", filters.author);
  appendTrimmedParam(params, "publisher", filters.publisher);
  appendTrimmedParam(params, "language", filters.language);
  appendTrimmedParam(params, "genre_slug", filters.genreSlug);

  return params;
}
function normalizeBookstoreSearchValue(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLocaleLowerCase();
}

function getBookstoreTagValues(bookstore) {
  return [bookstore?.tag_1, bookstore?.tag_2]
    .map((tag) => String(tag || "").trim())
    .filter(Boolean);
}

export function getBookstoreTags(bookstores = []) {
  const tags = new Map();

  bookstores.forEach((bookstore) => {
    getBookstoreTagValues(bookstore).forEach((tag) => {
      const normalizedTag = normalizeBookstoreSearchValue(tag);
      if (normalizedTag && !tags.has(normalizedTag)) {
        tags.set(normalizedTag, tag);
      }
    });
  });

  return [...tags.values()].sort((left, right) => left.localeCompare(right, "es", { sensitivity: "base" }));
}

export function filterBookstores(bookstores = [], { query = "", tag = "" } = {}) {
  const normalizedQuery = normalizeBookstoreSearchValue(query);
  const normalizedTag = normalizeBookstoreSearchValue(tag);

  return bookstores.filter((bookstore) => {
    const matchesName = !normalizedQuery || normalizeBookstoreSearchValue(bookstore?.name).includes(normalizedQuery);
    const matchesTag = !normalizedTag || getBookstoreTagValues(bookstore).some((bookstoreTag) => normalizeBookstoreSearchValue(bookstoreTag) === normalizedTag);
    return matchesName && matchesTag;
  });
}
