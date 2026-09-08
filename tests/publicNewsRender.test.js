import assert from "node:assert/strict";
import test from "node:test";

import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createServer } from "vite";

test("renders only active bookstore news with optional image and event date", async () => {
  const vite = await createServer({ server: { middlewareMode: true }, appType: "custom" });
  try {
    const { BookstoreNews } = await vite.ssrLoadModule("/src/pages/PublicPages.jsx");
    const emptyMarkup = renderToStaticMarkup(createElement(BookstoreNews, { items: [], storeName: "Librería Norte" }));
    const markup = renderToStaticMarkup(createElement(BookstoreNews, {
      storeName: "Librería Norte",
      items: [
        { id: 4, is_active: true, category: "event", title: "Firma", description: "Conocé a la autora.", event_date: "2026-09-20", image_url: "/news/4/image" },
        { id: 3, is_active: false, category: "offer", title: "No visible", description: "Archivada" },
        { id: 2, is_active: true, category: "offer", title: "Semana de descuentos", description: "Elegidos con descuento.", event_date: null, image_url: null },
        { id: 1, is_active: true, category: "news", title: "Llegaron libros", description: "Nuevos estantes.", event_date: null, image_url: null },
        { id: 0, is_active: true, category: "news", title: "No debe mostrarse", description: "Excede el límite." },
      ],
    }));

    assert.equal(emptyMarkup, "");
    assert.match(markup, /<section class="store-news"/);
    assert.match(markup, /Novedades de Librería Norte/);
    assert.match(markup, /Evento/);
    assert.match(markup, /Oferta/);
    assert.match(markup, /Novedad/);
    assert.match(markup, /20\/09\/2026/);
    assert.match(markup, /src="\/api\/news\/4\/image"/);
    assert.doesNotMatch(markup, /No visible|No debe mostrarse/);
  } finally {
    await vite.close();
  }
});
