export function mergeAiAutocompleteSuggestion(draftItem, suggestion) {
  const currentGenreIds = Array.isArray(draftItem.genre_ids) ? draftItem.genre_ids : [];
  const suggestionGenreIds = suggestion?.genre_id ? [suggestion.genre_id] : [];
  const hasDescription = Boolean((draftItem.description || "").trim());
  const hasGenre = currentGenreIds.length > 0;

  return {
    ...draftItem,
    description: hasDescription ? draftItem.description : (suggestion?.description || draftItem.description || ""),
    genre_ids: hasGenre ? currentGenreIds : suggestionGenreIds,
  };
}

export function getAiAutocompleteSourceState(suggestion) {
  if (!suggestion?.used_web || !Array.isArray(suggestion.sources)) {
    return { shouldShow: false, sources: [] };
  }
  const sources = suggestion.sources.filter((source) => source?.title && source?.url);
  return { shouldShow: sources.length > 0, sources };
}