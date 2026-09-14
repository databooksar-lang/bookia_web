import assert from "node:assert/strict";

import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createServer } from "vite";

export function registerNewsManagerRenderTests(test) {
test("renders an accessible news form with category, date, image, and feedback controls", async () => {
  const vite = await createServer({ server: { middlewareMode: true }, appType: "custom" });
  try {
    const { NewsManager } = await vite.ssrLoadModule("/src/components/NewsManager.jsx");
    const markup = renderToStaticMarkup(createElement(NewsManager));

    assert.match(markup, /<label>Categoría<select/);
    assert.match(markup, /<option value="offer">Oferta<\/option>/);
    assert.match(markup, /<option value="event">Evento<\/option>/);
    assert.match(markup, /<label>Título \*<input/);
    assert.match(markup, /<label class="dashboard-field-wide">Descripción \*<textarea/);
    assert.match(markup, /<input[^>]*maxLength="120"/);
    assert.match(markup, /<textarea[^>]*maxLength="1000"/);
    assert.match(markup, /type="date"/);
    assert.match(markup, /type="file"[^>]*accept="image\/png,image\/jpeg,image\/webp"/);
    assert.match(markup, /Crear novedad/);
    assert.match(markup, /0 de 3 novedades activas/);
    assert.match(markup, /aria-live="polite"/);
  } finally {
    await vite.close();
  }
});

test("uses a full-width no-image summary and private image preview for archived news", async () => {
  const vite = await createServer({ server: { middlewareMode: true }, appType: "custom" });
  try {
    const { NewsItemSummary, resetNewsImageInput } = await vite.ssrLoadModule("/src/components/NewsManager.jsx");
    const withoutImage = renderToStaticMarkup(createElement(NewsItemSummary, {
      item: { id: 4, category: "news", title: "Sin imagen", description: "Ocupa todo el ancho.", is_active: true, image_url: null },
    }));
    const archivedWithImage = renderToStaticMarkup(createElement(NewsItemSummary, {
      item: { id: 9, category: "offer", title: "Archivada", description: "Conserva su vista previa.", is_active: false, image_url: "/bookstores/norte/news/9/image" },
    }));
    const input = { value: "cover.webp" };

    resetNewsImageInput(input);
    assert.match(withoutImage, /class="news-item-summary no-image"/);
    assert.doesNotMatch(withoutImage, /<img/);
    assert.match(archivedWithImage, /src="\/api\/dashboard\/news\/9\/image"/);
    assert.match(archivedWithImage, /Archivada/);
    assert.equal(input.value, "");
  } finally {
    await vite.close();
  }
});
}
