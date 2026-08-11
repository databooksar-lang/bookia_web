import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createServer } from "vite";

export function registerReaderPublicProfileRenderTests(test) {
  test("renders the public monogram independently from passport traits", async () => {
    const vite = await createServer({ server: { middlewareMode: true }, appType: "custom" });
    try {
      const { ReaderMonogram, ReaderPassport } = await vite.ssrLoadModule("/src/components/ReaderPublicProfile.jsx");
      const markup = renderToStaticMarkup(createElement(ReaderPassport, { reader: {
        display_name: "Ana Borges",
        traits: { how_i_read: ["multiple_at_once"], what_i_seek: ["companionship"], book_relationship: ["love_recommending"] },
      } }));

      assert.match(renderToStaticMarkup(createElement(ReaderMonogram, { displayName: "Ana Borges", className: "is-profile-hero" })), />AB</);
      assert.match(markup, /Pasaporte lector/);
      assert.match(markup, /Siempre tengo varios abiertos/);
      assert.match(markup, /Una historia que acompañe/);
      assert.match(markup, /Me encanta recomendar/);
      assert.equal(renderToStaticMarkup(createElement(ReaderPassport, { reader: { display_name: "Ana", traits: {} } })), "");
    } finally {
      await vite.close();
    }
  });

  test("renders a compact public wanted-books preview without an empty section", async () => {
    const vite = await createServer({ server: { middlewareMode: true }, appType: "custom" });
    try {
      const { ReaderWantedBooksPublic } = await vite.ssrLoadModule("/src/components/ReaderPublicProfile.jsx");
      const items = [1, 2, 3, 4].map((id) => ({ title: `Libro ${id}`, author: id === 1 ? "Autora" : "", details: id === 1 ? "Edición ilustrada" : "" }));
      const markup = renderToStaticMarkup(createElement(ReaderWantedBooksPublic, { items }));

      assert.match(markup, /Libros que estoy buscando/);
      assert.match(markup, /Libro 1/);
      assert.match(markup, /Edición ilustrada/);
      assert.match(markup, /Libro 3/);
      assert.doesNotMatch(markup, /Libro 4/);
      assert.match(markup, /Ver lista completa/);
      assert.equal(renderToStaticMarkup(createElement(ReaderWantedBooksPublic, { items: [] })), "");
    } finally {
      await vite.close();
    }
  });
}
