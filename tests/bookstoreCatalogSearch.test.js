import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createServer } from "vite";

export function registerBookstoreCatalogSearchTests(test) {
  test("store catalog search exposes scoped text and existing filters", async () => {
    const vite = await createServer({ server: { middlewareMode: true }, appType: "custom" });
    try {
      const { BookstoreCatalogSearch } = await vite.ssrLoadModule("/src/pages/PublicPages.jsx");
      const markup = renderToStaticMarkup(createElement(BookstoreCatalogSearch, {
        storeName: "Librería de prueba", genres: [{ id: 1, slug: "novela", name: "Novela" }],
        initialFilters: {}, onSearch() {}, onClear() {},
      }));
      assert.match(markup, /Buscar en el catálogo de Librería de prueba/);
      for (const label of ["Más filtros", "Estado", "Idioma", "Género", "Novela", "Limpiar filtros"]) assert.ok(markup.includes(label));
      assert.match(markup, /type="submit"/);
      assert.doesNotMatch(markup, /Volver a buscar/);
    } finally { await vite.close(); }
  });
}
