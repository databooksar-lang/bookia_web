function appendTrimmedParam(params, key, value) {
  if (typeof value === "string" && value.trim()) {
    params.set(key, value.trim());
  }
}

export function buildPublicSearchParams(filters = {}) {
  const params = new URLSearchParams();
  appendTrimmedParam(params, "query", filters.query);
  appendTrimmedParam(params, "title", filters.title);
  appendTrimmedParam(params, "author", filters.author);
  if (filters.bookStatus === "nuevo" || filters.bookStatus === "usado") {
    params.set("book_status", filters.bookStatus);
  }
  appendTrimmedParam(params, "language", filters.language);
  appendTrimmedParam(params, "genre_slug", filters.genreSlug);

  return params;
}

export function selectDiscoveryCarouselItems(items = [], limit = 12) {
  const requestedLimit = Number.isFinite(limit) ? Math.max(0, Math.floor(limit)) : 12;
  if (requestedLimit === 0) return [];

  const selected = [];
  const selectedBookIds = new Set();
  const selectedBookstores = new Set();

  for (const item of items) {
    const bookId = item?.id;
    if (bookId === undefined || bookId === null || selectedBookIds.has(bookId)) continue;
    const bookstoreKey = item?.bookstore?.id ?? item?.bookstore?.slug ?? `book-${bookId}`;
    if (selectedBookstores.has(bookstoreKey)) continue;
    selected.push(item);
    selectedBookIds.add(bookId);
    selectedBookstores.add(bookstoreKey);
    if (selected.length === requestedLimit) return selected;
  }

  for (const item of items) {
    const bookId = item?.id;
    if (bookId === undefined || bookId === null || selectedBookIds.has(bookId)) continue;
    selected.push(item);
    selectedBookIds.add(bookId);
    if (selected.length === requestedLimit) break;
  }

  return selected;
}

export function getDiscoveryCarouselScrollOptions({ direction, clientWidth, reduceMotion }) {
  return {
    left: direction * Math.min(clientWidth * 0.85, 720),
    behavior: reduceMotion ? "auto" : "smooth",
  };
}

export function getDiscoveryCarouselNavigation({ scrollLeft, scrollWidth, clientWidth }) {
  const boundaryTolerance = 4;
  const maximumScroll = Math.max(0, scrollWidth - clientWidth);
  return {
    canPrevious: scrollLeft > boundaryTolerance,
    canNext: maximumScroll > boundaryTolerance && scrollLeft < maximumScroll - boundaryTolerance,
  };
}
function normalizeBookstoreSearchValue(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLocaleLowerCase();
}

export function buildGoogleMapsAddressUrl(address) {
  const normalizedAddress = String(address || "").trim();
  if (!normalizedAddress) return "";

  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(normalizedAddress)}`;
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

export function buildReadingClubSearchParams(genreSlug) {
  const params = new URLSearchParams();
  appendTrimmedParam(params, "genre_slug", genreSlug);
  return params;
}

export function getAvailableReadingClubGenres(genres = [], clubs = []) {
  const availableSlugs = new Set(
    clubs
      .map((club) => club?.genre?.slug)
      .filter(Boolean),
  );

  return genres.filter((genre) => genre?.slug && (!availableSlugs.size || availableSlugs.has(genre.slug)));
}
export function getVisibleReadingClubs(clubs = [], genreSlug = "", query = "", showAll = false) {
  const normalizedQuery = normalizeBookstoreSearchValue(query);
  const matchingClubs = normalizedQuery
    ? clubs.filter((club) => [club?.title, club?.description].some((value) => normalizeBookstoreSearchValue(value).includes(normalizedQuery)))
    : clubs;

  return genreSlug || normalizedQuery || showAll ? matchingClubs : matchingClubs.slice(0, 6);
}
