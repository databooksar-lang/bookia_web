import assert from "node:assert/strict";

import {
  MAX_AUTHOR_BOOKS,
  buildAuthorBookFormData,
  buildAuthorBookUpdatePayload,
  createAuthorBook,
  createAuthorBookDraft,
  deleteAuthorBook,
  getAuthorBookCapacityState,
  normalizeAuthorBooks,
  updateAuthorBook,
} from "../src/authorBooksState.js";

export function registerAuthorBooksStateTests(test) {
  test("normalizes complete author books and rejects malformed API entries", () => {
    assert.deepEqual(
      normalizeAuthorBooks({
        items: [
          { id: 7, title: " La casa ", synopsis: " Memoria ", genre: { id: 3, name: "Novela", slug: "novela" }, publisher: null, publication_year: 2026, external_url: " https://tienda.example/libro ", is_hidden: true, cover_url: "/dashboard/author-books/7/cover" },
          { id: 8, title: "Sin gÃ©nero", synopsis: "Texto", genre: null, cover_url: "/cover" },
          { id: 0, title: "InvÃ¡lido", synopsis: "Texto", genre: { id: 3 }, cover_url: "/cover" },
        ],
      }),
      [{ id: 7, title: "La casa", synopsis: "Memoria", genre: { id: 3, name: "Novela", slug: "novela" }, publisher: "", publication_year: 2026, external_url: "https://tienda.example/libro", is_hidden: true, cover_url: "/dashboard/author-books/7/cover" }],
    );
  });

  test("builds create drafts, multipart forms, and trimmed metadata updates", () => {
    const cover = new Blob(["cover"], { type: "image/png" });
    assert.deepEqual(createAuthorBookDraft(), {
      id: null,
      title: "",
      synopsis: "",
      genre_id: "",
      publisher: "",
      publication_year: "",
      external_url: "",
      is_hidden: false,
      cover: null,
    });
    assert.deepEqual(
      createAuthorBookDraft({ id: 7, title: "La casa", synopsis: "Memoria", genre: { id: 3 }, publication_year: 2026, is_hidden: true }),
      { id: 7, title: "La casa", synopsis: "Memoria", genre_id: "3", publisher: "", publication_year: "2026", external_url: "", is_hidden: true, cover: null },
    );

    const form = buildAuthorBookFormData({ title: "  La casa ", synopsis: " Memoria ", genre_id: "3", publisher: " Sur ", publication_year: "2026", external_url: " tienda.example/libro ", cover });
    assert.equal(form.get("title"), "La casa");
    assert.equal(form.get("synopsis"), "Memoria");
    assert.equal(form.get("genre_id"), "3");
    assert.equal(form.get("publisher"), "Sur");
    assert.equal(form.get("publication_year"), "2026");
    assert.equal(form.get("external_url"), "tienda.example/libro");
    assert.equal(form.get("cover").size, cover.size);
    assert.equal(form.get("cover").type, cover.type);
    const minimalForm = buildAuthorBookFormData({ title: "Libro", synopsis: "Texto", genre_id: "3", publisher: " ", publication_year: "", external_url: " ", cover });
    assert.equal(minimalForm.has("publisher"), false);
    assert.equal(minimalForm.has("publication_year"), false);
    assert.equal(minimalForm.has("external_url"), false);
    assert.deepEqual(
      buildAuthorBookUpdatePayload({ title: " La casa ", synopsis: " Memoria ", genre_id: "3", publisher: " ", publication_year: "", external_url: " tienda.example/libro ", is_hidden: true }),
      { title: "La casa", synopsis: "Memoria", genre_id: 3, publisher: null, publication_year: null, external_url: "tienda.example/libro", is_hidden: true },
    );
  });

  test("counts hidden books toward the five-book capacity", () => {
    const books = Array.from({ length: MAX_AUTHOR_BOOKS }, (_, index) => ({ id: index + 1, is_hidden: index === 0 }));
    assert.deepEqual(getAuthorBookCapacityState(books), { count: 5, remaining: 0, atLimit: true });
    assert.deepEqual(getAuthorBookCapacityState(books.slice(0, 4)), { count: 4, remaining: 1, atLimit: false });
  });

  test("uses multipart create and cover replacement while metadata stays JSON", async () => {
    const calls = [];
    const apiFetch = async (path, options = {}) => {
      calls.push({ path, options });
      return { item: { id: 9, title: "Libro" } };
    };
    const cover = new Blob(["cover"], { type: "image/png" });
    const draft = { id: 9, title: "Libro", synopsis: "Texto", genre_id: "3", publisher: "", publication_year: "", external_url: "tienda.example/libro", is_hidden: false, cover };

    await createAuthorBook(apiFetch, draft);
    await updateAuthorBook(apiFetch, draft);
    await deleteAuthorBook(apiFetch, 9);

    assert.equal(calls[0].path, "/dashboard/author-books");
    assert.equal(calls[0].options.method, "POST");
    assert.ok(calls[0].options.body instanceof FormData);
    assert.deepEqual(calls.slice(1), [
      { path: "/dashboard/author-books/9", options: { method: "PATCH", body: JSON.stringify({ title: "Libro", synopsis: "Texto", genre_id: 3, publisher: null, publication_year: null, external_url: "tienda.example/libro", is_hidden: false }) } },
      { path: "/dashboard/author-books/9/cover", options: { method: "PUT", body: calls[2].options.body } },
      { path: "/dashboard/author-books/9", options: { method: "DELETE" } },
    ]);
    assert.ok(calls[2].options.body instanceof FormData);
    assert.equal(calls[2].options.body.get("cover").size, cover.size);
  });
}
