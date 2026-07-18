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
