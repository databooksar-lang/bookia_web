export function getSingleGenreValue(selectedGenreIds) {
  return selectedGenreIds?.[0] ?? "";
}

export function buildSingleGenreIds(value) {
  if (value === "") {
    return [];
  }
  return [Number(value)];
}
