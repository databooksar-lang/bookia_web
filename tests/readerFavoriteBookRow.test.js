import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createServer } from "vite";

export function registerReaderFavoriteBookRowTests(test) {
  test("renders a favorite book cover through the resolved API URL", async () => {
    const vite = await createServer({ server: { middlewareMode: true }, appType: "custom" });
    try {
      const { BookCover } = await vite.ssrLoadModule("/src/components/BookCover.jsx");
      const markup = renderToStaticMarkup(createElement(BookCover, {
        item: { id: 9, title: "Ficciones", cover_image_url: "/catalog/9/cover" },
        className: "search-result-cover",
      }));

      assert.match(markup, /src="\/api\/catalog\/9\/cover"/);
      assert.match(markup, /alt="Tapa de Ficciones"/);
    } finally {
      await vite.close();
    }
  });

  test("renders the editorial no-cover placeholder in a reader favorite row", async () => {
    const vite = await createServer({ server: { middlewareMode: true }, appType: "custom" });
    try {
      const { ReaderFavoriteBookRow } = await vite.ssrLoadModule("/src/components/ReaderFavoriteBookRow.jsx");
      const markup = renderToStaticMarkup(createElement(ReaderFavoriteBookRow, {
        item: { id: 12, title: "Libro sin tapa", author: "Autora", bookstore: { name: "Librería Sur" } },
        onRemove: () => {},
      }));

      assert.match(markup, /Sin tapa disponible para Libro sin tapa/);
      assert.match(markup, /Libro sin tapa/);
      assert.match(markup, /Autora/);
      assert.match(markup, /Librería Sur/);
      assert.match(markup, /Quitar de favoritos/);
    } finally {
      await vite.close();
    }
  });
}
