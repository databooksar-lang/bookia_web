import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createServer } from "vite";

export function registerBookstoreDescriptionRenderTests(test) {
  test("renders formatted descriptions with secure external links", async () => {
    const vite = await createServer({ server: { middlewareMode: true }, appType: "custom" });
    try {
      const { BookstoreDescription } = await vite.ssrLoadModule("/src/components/BookstoreDescription.jsx");
      const markup = renderToStaticMarkup(createElement(BookstoreDescription, { value: "**Especialistas**\n\n- Talleres\n- [Web](https://libreria.example)" }));

      assert.match(markup, /<strong>Especialistas<\/strong>/);
      assert.match(markup, /<ul>/);
      assert.match(markup, /target="_blank"/);
      assert.match(markup, /rel="noopener noreferrer"/);
    } finally {
      await vite.close();
    }
  });
}
