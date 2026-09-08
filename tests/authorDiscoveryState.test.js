import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createServer } from "vite";

import { normalizeAuthorDiscoveryItems } from "../src/authorDiscoveryState.js";

export function registerAuthorDiscoveryStateTests(test) {
  test("keeps only complete active-author discovery records and limits the carousel", () => {
    const items = normalizeAuthorDiscoveryItems([
      { display_name: "Ana Borges", slug: "ana-borges", description: "Escribe poesía.", avatar_url: "/authors/ana-borges/avatar" },
      { display_name: "Sin alias", description: "No debe mostrarse." },
      { display_name: "Nombre vacío", slug: "", description: "No debe mostrarse." },
      { display_name: "Bruno Díaz", slug: "bruno-diaz", description: null, avatar_url: null },
    ], 1);

    assert.deepEqual(items, [{ display_name: "Ana Borges", slug: "ana-borges", description: "Escribe poesía.", avatar_url: "/authors/ana-borges/avatar" }]);
  });

  test("renders an author card with a public-profile action and monogram fallback", async () => {
    const vite = await createServer({ server: { middlewareMode: true }, appType: "custom" });
    try {
      const { AuthorsCarousel } = await vite.ssrLoadModule("/src/pages/PublicPages.jsx");
      const markup = renderToStaticMarkup(createElement(AuthorsCarousel, {
        authors: [{ display_name: "Ana Borges", slug: "ana-borges", description: "Escribe poesía.", avatar_url: null }],
        loading: false,
      }));
      assert.match(markup, /Autores en Bookia/);
      assert.match(markup, /Ana Borges/);
      assert.match(markup, /Escribe poesía/);
      assert.match(markup, /href="\/readers\/ana-borges"/);
      assert.match(markup, />Ver perfil <svg/);
      assert.match(markup, />AB</);
    } finally {
      await vite.close();
    }
  });
}
