export function mergeAiAutocompleteSuggestion(draftItem, suggestion, options = {}) {
  const currentGenreIds = Array.isArray(draftItem.genre_ids) ? draftItem.genre_ids : [];
  const suggestionGenreIds = suggestion?.genre_id ? [suggestion.genre_id] : [];
  const suggestionDescription = String(suggestion?.description ?? "").trim();
  const hasDescription = Boolean((draftItem.description || "").trim());
  const hasGenre = currentGenreIds.length > 0;
  const shouldOverwrite = Boolean(options.overwriteExisting);

  return {
    ...draftItem,
    description: shouldOverwrite
      ? (suggestionDescription ? suggestion.description : (draftItem.description || ""))
      : (hasDescription ? draftItem.description : (suggestion?.description || draftItem.description || "")),
    genre_ids: shouldOverwrite
      ? (suggestionGenreIds.length > 0 ? suggestionGenreIds : currentGenreIds)
      : (hasGenre ? currentGenreIds : suggestionGenreIds),
  };
}

export function getAiAutocompleteSourceState(suggestion) {
  if (!suggestion?.used_web || !Array.isArray(suggestion.sources)) {
    return { shouldShow: false, sources: [] };
  }
  const sources = suggestion.sources.filter((source) => source?.title && source?.url);
  return { shouldShow: sources.length > 0, sources };
}