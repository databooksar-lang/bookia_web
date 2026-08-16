const READER_PROFILE_SECTIONS = new Set(["info", "favorites", "wanted", "author"]);

function normalizeReaderProfileSection(value) {
  return READER_PROFILE_SECTIONS.has(value) ? value : "info";
}

export function parseReaderProfileNavigation(search = "") {
  return { section: normalizeReaderProfileSection(new URLSearchParams(search).get("section")) };
}

export function buildReaderProfileUrl(section) {
  return `/profile?section=${normalizeReaderProfileSection(section)}`;
}
