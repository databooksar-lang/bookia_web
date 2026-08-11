import assert from "node:assert/strict";

import { buildWantedBookPayload, createWantedBookDraft, getPublicWantedBooksView, normalizePublicWantedBooks, normalizeWantedBooks } from "../src/readerWantedBooksState.js";

export function registerReaderWantedBooksStateTests(test) {
  test("normalizes complete wanted books in API order", () => {
    assert.deepEqual(
      normalizeWantedBooks({ items: [{ id: 3, title: "Los sorias", author: null, details: "Simurg" }, { id: 0, title: "Invalido" }, { id: 4, title: " " }] }),
      [{ id: 3, title: "Los sorias", author: "", details: "Simurg" }],
    );
  });

  test("creates editable wanted-book drafts and trimmed payloads", () => {
    assert.deepEqual(createWantedBookDraft(), { id: null, title: "", author: "", details: "" });
    assert.deepEqual(createWantedBookDraft({ id: 7, title: "Rayuela", author: null }), { id: 7, title: "Rayuela", author: "", details: "" });
    assert.deepEqual(buildWantedBookPayload({ title: "  Rayuela ", author: " Cortázar ", details: "  Sur  " }), { title: "Rayuela", author: "Cortázar", details: "Sur" });
  });

  test("shows three public wishes until the reader expands the list", () => {
    const items = normalizePublicWantedBooks([1, 2, 3, 4].map((id) => ({ title: ` Libro ${id} ` })));
    assert.deepEqual(getPublicWantedBooksView(items, false).map((item) => item.title), ["Libro 1", "Libro 2", "Libro 3"]);
    assert.deepEqual(getPublicWantedBooksView(items, true).map((item) => item.title), ["Libro 1", "Libro 2", "Libro 3", "Libro 4"]);
  });
}
