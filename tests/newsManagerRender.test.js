import assert from "node:assert/strict";
import test from "node:test";

import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createServer } from "vite";

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
    assert.match(markup, /type="date"/);
    assert.match(markup, /type="file"/);
    assert.match(markup, /Crear novedad/);
    assert.match(markup, /aria-live="polite"/);
  } finally {
    await vite.close();
  }
});
