export const MAX_AUTHOR_BOOKS = 5;

export function createAuthorBookDraft(item = {}) {
  return {
    id: Number.isInteger(item?.id) ? item.id : null,
    title: item?.title || "",
    synopsis: item?.synopsis || "",
    genre_id: Number.isInteger(item?.genre?.id) ? String(item.genre.id) : "",
    publisher: item?.publisher || "",
    publication_year: Number.isInteger(item?.publication_year) ? String(item.publication_year) : "",
    is_hidden: item?.is_hidden === true,
    cover: null,
  };
}

export function normalizeAuthorBooks(data = {}) {
  const items = Array.isArray(data) ? data : Array.isArray(data?.items) ? data.items : [];
  return items.flatMap((item) => {
    const title = String(item?.title || "").trim();
    const synopsis = String(item?.synopsis || "").trim();
    const coverUrl = String(item?.cover_url || "").trim();
    if (!Number.isInteger(item?.id) || item.id <= 0 || !title || !synopsis || !Number.isInteger(item?.genre?.id) || !coverUrl) return [];
    return [{
      ...item,
      title,
      synopsis,
      publisher: String(item.publisher || "").trim(),
      publication_year: Number.isInteger(item.publication_year) ? item.publication_year : null,
      is_hidden: item.is_hidden === true,
      cover_url: coverUrl,
    }];
  });
}

export function buildAuthorBookFormData(draft = {}) {
  const form = new FormData();
  form.set("title", String(draft.title || "").trim());
  form.set("synopsis", String(draft.synopsis || "").trim());
  form.set("genre_id", String(draft.genre_id || "").trim());
  const publisher = String(draft.publisher || "").trim();
  const publicationYear = String(draft.publication_year || "").trim();
  if (publisher) form.set("publisher", publisher);
  if (publicationYear) form.set("publication_year", publicationYear);
  if (draft.cover) form.set("cover", draft.cover);
  return form;
}

export function buildAuthorBookUpdatePayload(draft = {}) {
  const year = String(draft.publication_year || "").trim();
  return {
    title: String(draft.title || "").trim(),
    synopsis: String(draft.synopsis || "").trim(),
    genre_id: Number(draft.genre_id),
    publisher: String(draft.publisher || "").trim() || null,
    publication_year: year ? Number(year) : null,
    is_hidden: draft.is_hidden === true,
  };
}

export function getAuthorBookCapacityState(items = []) {
  const count = Array.isArray(items) ? items.length : 0;
  return {
    count,
    remaining: Math.max(0, MAX_AUTHOR_BOOKS - count),
    atLimit: count >= MAX_AUTHOR_BOOKS,
  };
}

export async function loadAuthorBooks(apiFetch) {
  return normalizeAuthorBooks(await apiFetch("/dashboard/author-books"));
}

export async function createAuthorBook(apiFetch, draft) {
  const data = await apiFetch("/dashboard/author-books", {
    method: "POST",
    body: buildAuthorBookFormData(draft),
  });
  return data.item;
}

export async function updateAuthorBook(apiFetch, draft) {
  const metadata = await apiFetch(`/dashboard/author-books/${draft.id}`, {
    method: "PATCH",
    body: JSON.stringify(buildAuthorBookUpdatePayload(draft)),
  });
  if (!draft.cover) return metadata.item;
  const coverForm = new FormData();
  coverForm.set("cover", draft.cover);
  const cover = await apiFetch(`/dashboard/author-books/${draft.id}/cover`, {
    method: "PUT",
    body: coverForm,
  });
  return cover.item;
}

export async function setAuthorBookHidden(apiFetch, item) {
  const data = await apiFetch(`/dashboard/author-books/${item.id}`, {
    method: "PATCH",
    body: JSON.stringify({ is_hidden: !item.is_hidden }),
  });
  return data.item;
}

export async function deleteAuthorBook(apiFetch, itemId) {
  await apiFetch(`/dashboard/author-books/${itemId}`, { method: "DELETE" });
}
