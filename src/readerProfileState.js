export function buildReaderProfilePayload(draft = {}) {
  return {
    display_name: draft.display_name || "",
    slug: draft.slug || "",
    description: draft.description || "",
    is_public: draft.is_public ?? true,
    favorite_genre_ids: Array.isArray(draft.favorite_genre_ids) ? draft.favorite_genre_ids : [],
  };
}
export function createReaderProfileDraft(profile = {}) {
  return {
    display_name: profile?.display_name || "",
    slug: profile?.slug || "",
    description: profile?.description || "",
    is_public: profile?.is_public ?? true,
    favorite_genre_ids: (profile?.favorite_genres || []).map((genre) => genre?.id).filter(Number.isInteger),
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
