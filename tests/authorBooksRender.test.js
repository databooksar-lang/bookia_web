import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createServer } from "vite";

import { createAuthorBookDraft } from "../src/authorBooksState.js";

export function registerAuthorBooksRenderTests(test) {
  test("renders private author books with capacity, visibility, and reusable editing", async () => {
    const vite = await createServer({ server: { middlewareMode: true }, appType: "custom" });
    try {
      const { AuthorBooksPanel } = await vite.ssrLoadModule("/src/components/AuthorBooksManager.jsx");
      const book = {
        id: 7,
        title: "La casa del viento",
        synopsis: "Una novela sobre memoria.",
        genre: { id: 3, name: "Novela", slug: "novela" },
        publisher: "Ediciones Sur",
        publication_year: 2026,
        is_hidden: true,
        cover_url: "/dashboard/author-books/7/cover",
        updated_at: "2026-08-16T12:00:00Z",
      };
      const props = {
        books: [book],
        draft: createAuthorBookDraft(),
        genres: [book.genre],
        loading: false,
        saving: false,
        feedback: "",
        previewUrl: "",
        onDraftChange() {},
        onCoverChange() {},
        onSubmit() {},
        onCancelEdit() {},
        onEdit() {},
        onToggleHidden() {},
        onDelete() {},
      };

      const createMarkup = renderToStaticMarkup(createElement(AuthorBooksPanel, props));
      const editMarkup = renderToStaticMarkup(createElement(AuthorBooksPanel, { ...props, draft: createAuthorBookDraft(book) }));
      const limitMarkup = renderToStaticMarkup(createElement(AuthorBooksPanel, {
        ...props,
        books: Array.from({ length: 5 }, (_, index) => ({ ...book, id: index + 1 })),
      }));

      assert.match(createMarkup, /Mis libros/);
      assert.match(createMarkup, /1 de 5 libros/);
      assert.match(createMarkup, /se publica en tu perfil público/i);
      assert.match(createMarkup, /Agregar libro/);
      assert.match(createMarkup, /Portada/);
      assert.match(createMarkup, /La casa del viento/);
      assert.match(createMarkup, /Ediciones Sur · 2026/);
      assert.match(createMarkup, />Oculto</);
      assert.match(createMarkup, />Mostrar</);
      assert.match(createMarkup, />Editar</);
      assert.match(createMarkup, />Eliminar</);
      assert.match(editMarkup, /Editar libro/);
      assert.match(editMarkup, /Guardar cambios/);
      assert.match(editMarkup, /Conservar portada actual/);
      assert.match(editMarkup, /Cancelar/);
      assert.match(limitMarkup, /eliminar uno para liberar un cupo/i);
      assert.doesNotMatch(limitMarkup, /ocultar o eliminar uno para liberar un cupo/i);
    } finally {
      await vite.close();
    }
  });
}
