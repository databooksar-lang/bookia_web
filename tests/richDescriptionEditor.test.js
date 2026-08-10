import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createServer } from "vite";

export function registerRichDescriptionEditorTests(test) {
  test("renders the shared rich-description controls and preview", async () => {
    const vite = await createServer({ server: { middlewareMode: true }, appType: "custom" });
    try {
      const { RichDescriptionEditor } = await vite.ssrLoadModule("/src/components/RichDescriptionEditor.jsx");
      const markup = renderToStaticMarkup(createElement(RichDescriptionEditor, {
        value: "**Leo**\n\n- Narrativa",
        onChange: () => {},
        placeholder: "Contá tu historia lectora.",
      }));

      assert.match(markup, /aria-label="Formato de la descripción"/);
      assert.match(markup, /aria-label="Negrita"/);
      assert.match(markup, /aria-label="Cursiva"/);
      assert.match(markup, /aria-label="Insertar enlace"/);
      assert.match(markup, /aria-label="Lista con viñetas"/);
      assert.match(markup, /aria-label="Lista numerada"/);
      assert.match(markup, /rows="6"/);
      assert.match(markup, /maxLength="5000"/);
      assert.match(markup, /Vista previa/);
      assert.match(markup, /<strong>Leo<\/strong>/);
      assert.match(markup, /<ul>/);
    } finally {
      await vite.close();
    }
  });
}
