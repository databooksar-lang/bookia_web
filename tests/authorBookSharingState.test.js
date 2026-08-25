import assert from "node:assert/strict";

import { buildAuthorBookShareMessage, buildAuthorBookShareUrl, getSharedAuthorBookId } from "../src/authorBookSharingState.js";

export function registerAuthorBookSharingStateTests(register) {
  register("builds a public author-book link and message", () => {
    const book = { id: 7, title: "La casa del viento", genre: { name: "Novela" }, publisher: "Ediciones Sur", publication_year: 2026 };
    assert.equal(buildAuthorBookShareUrl({ origin: "https://bookia.app", readerSlug: "ana-borges", bookId: 7 }), "https://bookia.app/readers/ana-borges?book=7");
    assert.equal(buildAuthorBookShareMessage({ book, authorName: "Ana Borges" }), "Conocé \"La casa del viento\" de Ana Borges en Bookia. Género: Novela. Editorial: Ediciones Sur. Año: 2026.");
  });

  register("accepts only a positive shared author-book id", () => {
    assert.equal(getSharedAuthorBookId("?book=7"), 7);
    assert.equal(getSharedAuthorBookId("?book=0"), null);
    assert.equal(getSharedAuthorBookId("?book=7x"), null);
  });
}
