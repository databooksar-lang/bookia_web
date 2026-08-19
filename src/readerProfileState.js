import { normalizeReaderTraits } from "./readerIdentityState.js";

const READER_SOCIAL_PLATFORMS = new Set(["instagram", "tiktok", "youtube", "goodreads", "website"]);

export function normalizeReaderSocialLinks(links) {
  if (!Array.isArray(links)) return [];
  return links.flatMap((link) => {
    const platform = String(link?.platform || "").trim().toLowerCase();
    const url = String(link?.url || "").trim();
    return READER_SOCIAL_PLATFORMS.has(platform) && url ? [{ platform, url }] : [];
  }).slice(0, 2);
}

export function buildReaderProfilePayload(draft = {}) {
  return {
    display_name: draft.display_name || "",
    slug: draft.slug || "",
    description: draft.description || "",
    is_public: draft.is_public ?? true,
    favorite_genre_ids: Array.isArray(draft.favorite_genre_ids) ? draft.favorite_genre_ids : [],
    traits: normalizeReaderTraits(draft.traits),
    social_links: normalizeReaderSocialLinks(draft.social_links),
  };
}
export function createReaderProfileDraft(profile = {}) {
  return {
    display_name: profile?.display_name || "",
    slug: profile?.slug || "",
    description: profile?.description || "",
    is_public: profile?.is_public ?? true,
    favorite_genre_ids: (profile?.favorite_genres || []).map((genre) => genre?.id).filter(Number.isInteger),
    traits: normalizeReaderTraits(profile?.traits),
    social_links: normalizeReaderSocialLinks(profile?.social_links),
  };
}

export function toggleReaderFavoriteGenre(selectedGenreIds = [], genreId) {
  return selectedGenreIds.includes(genreId)
    ? selectedGenreIds.filter((id) => id !== genreId)
    : [...selectedGenreIds, genreId];
}

export function normalizeReaderFavoriteGenres(data = {}) {
  return Array.isArray(data?.items) ? data.items : [];
}
export function favoriteGenreSelectionLabel(selectedGenreIds = []) {
  return `${selectedGenreIds.length} generos seleccionados`;
}
export function getReaderFavoriteGenresState({ loading, error, genres = [] }) {
  if (loading) return { kind: "loading", message: "Cargando generos..." };
  if (error) return { kind: "error", message: error };
  if (!genres.length) return { kind: "empty", message: "Todavia no hay generos disponibles." };
  return { kind: "ready", message: "" };
}

export function normalizeReaderFavorites(data = {}) {
  return (data.books || []).filter((book) => Number.isInteger(book?.id) && Boolean(String(book.title || "").trim()));
}

export function normalizeReaderFollowedBookstores(data = {}) {
  return (data.bookstores || []).flatMap((bookstore) => {
    if (!Number.isInteger(bookstore?.id) || bookstore.id <= 0 || !String(bookstore.name || "").trim()) return [];
    if (bookstore.is_active === false) {
      return [{ id: bookstore.id, name: bookstore.name, slug: "", logo_url: "", address: "", is_active: false }];
    }
    return String(bookstore.slug || "").trim() ? [bookstore] : [];
  });
}

export function loadReaderFavorites({ fetchFavorites, onFavorites, onBookstores, onError, onSettled }) {
  let active = true;

  fetchFavorites()
    .then((data) => {
      if (active) onFavorites(normalizeReaderFavorites(data));
      if (active && onBookstores) onBookstores(normalizeReaderFollowedBookstores(data));
    })
    .catch((error) => {
      if (active) onError(error);
    })
    .finally(() => {
      if (active) onSettled();
    });

  return () => {
    active = false;
  };
}
