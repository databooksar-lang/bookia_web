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

function prioritizeCoveredItems(items, coverKey) {
  return [...items.filter((item) => item?.[coverKey]), ...items.filter((item) => !item?.[coverKey])];
}

function selectDistinctFirst(items, getId, getGroup) {
  const selected = [];
  const selectedIds = new Set();
  const selectedGroups = new Set();
  for (const item of items) {
    const id = getId(item);
    if (id === undefined || id === null || selectedIds.has(id)) continue;
    const group = getGroup(item, id);
    if (selectedGroups.has(group)) continue;
    selected.push(item);
    selectedIds.add(id);
    selectedGroups.add(group);
  }
  for (const item of items) {
    const id = getId(item);
    if (id === undefined || id === null || selectedIds.has(id)) continue;
    selected.push(item);
    selectedIds.add(id);
  }
  return selected;
}

function getAuthorBookDiscoveryItems(authors = []) {
  return authors.flatMap((author) => {
    const displayName = String(author?.display_name || "").trim();
    const slug = String(author?.slug || "").trim();
    if (!displayName || !slug || !Array.isArray(author?.books)) return [];
    const authorProfile = { display_name: displayName, slug, author_contact: author.author_contact || { available: false, contact_requires_auth: false } };
    return author.books
      .filter((book) => Number.isSafeInteger(book?.id) && book.id > 0 && String(book?.title || "").trim() && String(book?.cover_url || "").trim())
      .map((book) => ({ ...book, id: `author:${slug}:${book.id}`, author_book_id: book.id, author: displayName, cover_image_url: book.cover_url, discovery_kind: "author_book", author_profile: authorProfile }));
  });
}

export function selectDiscoveryCarouselItems(catalogItems = [], authorsOrLimit = [], requestedLimit = 12) {
  const authors = Array.isArray(authorsOrLimit) ? authorsOrLimit : [];
  const limit = Array.isArray(authorsOrLimit) ? requestedLimit : authorsOrLimit;
  const maximum = Number.isFinite(limit) ? Math.max(0, Math.floor(limit)) : 12;
  if (maximum === 0) return [];
  const catalog = selectDistinctFirst(prioritizeCoveredItems(catalogItems, "cover_image_url"), (item) => item?.id, (item, id) => item?.bookstore?.id ?? item?.bookstore?.slug ?? `book-${id}`);
  const authorBooks = selectDistinctFirst(getAuthorBookDiscoveryItems(authors), (item) => item?.id, (item) => item?.author_profile?.slug);
  const selected = [];
  for (let index = 0; selected.length < maximum && (index < catalog.length || index < authorBooks.length); index += 1) {
    if (index < catalog.length) selected.push(catalog[index]);
    if (selected.length < maximum && index < authorBooks.length) selected.push(authorBooks[index]);
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
