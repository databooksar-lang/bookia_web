import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createServer } from "vite";

export function registerReaderOnboardingRenderTests(test) {
  test("renders optional books, an explicit author choice, and a welcome with profile links", async () => {
    const vite = await createServer({ server: { middlewareMode: true }, appType: "custom" });
    try {
      const { ReaderOnboardingPage } = await vite.ssrLoadModule("/src/pages/ReaderOnboardingPage.jsx");
      const render = (step) => renderToStaticMarkup(createElement(ReaderOnboardingPage, { me: { reader_profile: { onboarding_step: step }, author_profile: { is_active: true } } }));
      assert.match(render("wanted"), /¿Qué libros te gustaría encontrar en Bookia\?/);
      assert.match(render("wanted"), /Omitir/);
      assert.match(render("author"), /¿Sos autor\/a\?/);
      assert.match(render("author"), /type="radio"[^>]*required/);
      assert.doesNotMatch(render("author"), /checked=""/);
      const welcome = render("complete");
      assert.match(welcome, /Cargar mis libros/);
      assert.match(welcome, /href="\/profile\?section=clubs"/);
      assert.match(welcome, /Explorar Bookia/);
      const { RegisterPage } = await vite.ssrLoadModule("/src/pages/RegisterPage.jsx");
      const registration = renderToStaticMarkup(createElement(RegisterPage, { locationSearch: "?profile=reader" }));
      assert.doesNotMatch(registration, /Soy autor\/a/);
      assert.match(registration, /Crear cuenta con correo/);
    } finally { await vite.close(); }
  });
}
