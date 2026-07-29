export function createReaderProfileDraft(profile = {}) {
  return {
    display_name: profile?.display_name || "",
    slug: profile?.slug || "",
    description: profile?.description || "",
    is_public: profile?.is_public ?? true,
  };
}

export function normalizeReaderFavorites(data = {}) {
  return (data.books || []).filter((book) => Number.isInteger(book?.id) && Boolean(String(book.title || "").trim()));
}

export function loadReaderFavorites({ fetchFavorites, onFavorites, onError, onSettled }) {
  let active = true;

  fetchFavorites()
    .then((data) => {
      if (active) onFavorites(normalizeReaderFavorites(data));
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
