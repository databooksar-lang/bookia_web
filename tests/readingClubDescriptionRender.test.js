import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createServer } from "vite";

const FORMATTED_DESCRIPTION = "**Encuentro especial**\n\n- Conversamos\n- [Más información](https://bookia.example/club)";

export function registerReadingClubDescriptionRenderTests(test) {
  test("renders formatted reading-club descriptions in management and public cards", async () => {
    const vite = await createServer({ server: { middlewareMode: true }, appType: "custom" });
    try {
      const { ReadingClubManager } = await vite.ssrLoadModule("/src/components/ReadingClubManager.jsx");
      const { ReadingClubDetailModal, ReadingClubPublicCard } = await vite.ssrLoadModule("/src/pages/PublicPages.jsx");
      const managerMarkup = renderToStaticMarkup(createElement(ReadingClubManager, {
        host: { type: "bookstore", id: 1, slug: "libreria" },
        hostName: "Librería",
        source: "test",
        onClubCountChange: () => {},
        genres: [{ id: 1, name: "Narrativa" }],
        genresLoading: false,
        genresError: "",
      }));
      const cardMarkup = renderToStaticMarkup(createElement(ReadingClubPublicCard, {
        club: { id: 1, title: "Club", description: FORMATTED_DESCRIPTION, genre: { name: "Narrativa" } },
      }));
      const detailMarkup = renderToStaticMarkup(createElement(ReadingClubDetailModal, {
        selectedClub: { id: 1, title: "Club", description: FORMATTED_DESCRIPTION, genre: { name: "Narrativa" } },
        onClose: () => {},
      }));
      const unsafeCardMarkup = renderToStaticMarkup(createElement(ReadingClubPublicCard, {
        club: { id: 2, title: "Club seguro", description: "<img src=x onerror=alert(1)> [No](javascript:alert(1))", genre: { name: "Narrativa" } },
      }));

      assert.match(managerMarkup, /aria-label="Formato de la descripción"/);
      assert.match(managerMarkup, /Vista previa/);
      assert.match(cardMarkup, /<strong>Encuentro especial<\/strong>/);
      assert.match(cardMarkup, /<ul>/);
      assert.match(cardMarkup, /href="https:\/\/bookia\.example\/club"/);
      assert.match(detailMarkup, /<strong>Encuentro especial<\/strong>/);
      assert.doesNotMatch(unsafeCardMarkup, /<img/);
      assert.doesNotMatch(unsafeCardMarkup, /href="javascript:/);
    } finally {
      await vite.close();
    }
  });
}
