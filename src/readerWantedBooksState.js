export const MAX_READER_WANTED_BOOKS = 20;

export function createWantedBookDraft(item = {}) {
  return {
    id: Number.isInteger(item?.id) ? item.id : null,
    title: item?.title || "",
    author: item?.author || "",
    details: item?.details || "",
  };
}

export function buildWantedBookPayload(draft = {}) {
  return {
    title: String(draft.title || "").trim(),
    author: String(draft.author || "").trim(),
    details: String(draft.details || "").trim(),
  };
}

export function normalizeWantedBooks(data = {}) {
  const items = Array.isArray(data) ? data : Array.isArray(data?.items) ? data.items : [];
  return items.flatMap((item) => {
    if (!Number.isInteger(item?.id) || item.id <= 0 || !String(item.title || "").trim()) return [];
    return [{
      ...item,
      title: String(item.title).trim(),
      author: String(item.author || "").trim(),
      details: String(item.details || "").trim(),
    }];
  });
}

export function normalizePublicWantedBooks(data = []) {
  const items = Array.isArray(data) ? data : [];
  return items.flatMap((item) => {
    if (!String(item?.title || "").trim()) return [];
    return [{
      title: String(item.title).trim(),
      author: String(item.author || "").trim(),
      details: String(item.details || "").trim(),
    }];
  });
}

export function getPublicWantedBooksView(items = [], expanded = false) {
  return expanded ? items : items.slice(0, 3);
}
