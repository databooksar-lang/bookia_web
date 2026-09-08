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
      assert.match(markup, /<section id="autores" class="authors-carousel"/);
      assert.match(markup, /Ana Borges/);
      assert.match(markup, /Escribe poesía/);
      assert.match(markup, /href="\/readers\/ana-borges"/);
      assert.match(markup, />Ver perfil <svg/);
      assert.match(markup, />AB</);
    } finally {
      await vite.close();
    }
  });

  test("renders a discovery author book with its cover and author label", async () => {
    const vite = await createServer({ server: { middlewareMode: true }, appType: "custom" });
    try {
      const { DiscoveryCarousel } = await vite.ssrLoadModule("/src/pages/PublicPages.jsx");
      const markup = renderToStaticMarkup(createElement(DiscoveryCarousel, {
        items: [{
          id: "author:ana-borges:7",
          discovery_kind: "author_book",
          title: "La casa del viento",
          author: "Ana Borges",
          cover_image_url: "/readers/ana-borges/author-books/7/cover",
          author_profile: { display_name: "Ana Borges", slug: "ana-borges", author_contact: { available: false, contact_requires_auth: false } },
        }],
        loading: false,
        onOpenBook() {},
      }));

      assert.match(markup, /Tapa de La casa del viento/);
      assert.match(markup, /Ana Borges/);
      assert.match(markup, /Autor en Bookia/);
    } finally {
      await vite.close();
    }
  });
}
