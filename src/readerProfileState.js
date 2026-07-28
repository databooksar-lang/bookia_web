export function createReaderProfileDraft(profile = {}) {
  return {
    display_name: profile?.display_name || "",
    slug: profile?.slug || "",
    description: profile?.description || "",
    is_public: profile?.is_public ?? true,
  };
}

export function loadReaderFavorites({ fetchFavorites, onFavorites, onError, onSettled }) {
  let active = true;

  fetchFavorites()
    .then((data) => {
      if (active) onFavorites(data.books || []);
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
