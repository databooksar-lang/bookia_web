import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createServer } from "vite";

import { activateAuthorProfile, deactivateAuthorProfile, getAuthorProfileView, isActiveAuthor } from "../src/authorProfileState.js";

export function registerAuthorProfileStateTests(test) {
  test("derives author views without reader profile privacy", () => {
    assert.equal(isActiveAuthor(null), false);
    assert.equal(isActiveAuthor({ is_active: false }), false);
    assert.equal(isActiveAuthor({ is_active: true }), true);
    assert.equal(getAuthorProfileView({ authorProfile: null, readerProfile: {} }), "inactive");
    assert.equal(getAuthorProfileView({ authorProfile: { is_active: true }, readerProfile: {} }), "active_public");
  });

  test("uses the protected author activation and deactivation API contracts", async () => {
    const requests = [];
    const apiFetch = async (path, options) => {
      requests.push({ path, options });
      return { author_profile: { is_active: path === "/dashboard/author-profile/activate" } };
    };

    assert.deepEqual(await activateAuthorProfile(apiFetch), { is_active: true });
    assert.deepEqual(await deactivateAuthorProfile(apiFetch), { is_active: false });
    assert.deepEqual(requests, [
      { path: "/dashboard/author-profile/activate", options: { method: "POST", body: JSON.stringify({ rights_declaration_accepted: true }) } },
      { path: "/dashboard/author-profile/deactivate", options: { method: "POST" } },
    ]);
  });

  test("renders activation consent, active state, and the public badge from real components", async () => {
    const vite = await createServer({ server: { middlewareMode: true }, appType: "custom" });
    try {
      const { AuthorProfileSection } = await vite.ssrLoadModule("/src/components/AuthorProfileSection.jsx");
      const { ReaderAuthorBadge } = await vite.ssrLoadModule("/src/components/ReaderPublicProfile.jsx");
      const { ReaderProfilePage } = await vite.ssrLoadModule("/src/pages/ReaderProfilePage.jsx");
      const sharedProps = { accepted: false, onAcceptedChange() {}, onActivate() {}, onDeactivate() {}, pending: false, feedback: "" };
      const inactiveMarkup = renderToStaticMarkup(createElement(AuthorProfileSection, { ...sharedProps, authorProfile: null, readerProfile: { is_public: false } }));
      const activeMarkup = renderToStaticMarkup(createElement(AuthorProfileSection, { ...sharedProps, authorProfile: { is_active: true }, readerProfile: { is_public: true }, feedback: "Perfil activado." }));

      assert.match(inactiveMarkup, /rights-declaration/);
      assert.match(inactiveMarkup, /Activar perfil de autor\/a/);
      assert.doesNotMatch(inactiveMarkup, /Desactivar perfil/);
      assert.match(activeMarkup, /Tu perfil de autor\/a está activo/);
      assert.match(activeMarkup, /Desactivar perfil/);
      assert.doesNotMatch(activeMarkup, /rights-declaration/);
      assert.equal(renderToStaticMarkup(createElement(ReaderAuthorBadge, { isAuthor: false })), "");
      assert.match(renderToStaticMarkup(createElement(ReaderAuthorBadge, { isAuthor: true })), />Autor\/a en Bookia</);

      const activePageMarkup = renderToStaticMarkup(createElement(ReaderProfilePage, {
        me: { reader_profile: { display_name: "Ana", slug: "ana", description: "", is_public: true, favorite_genres: [], traits: {} }, author_profile: { is_active: true } },
        refreshMe: async () => {},
        locationSearch: "?section=author",
      }));
      const inactiveInfoMarkup = renderToStaticMarkup(createElement(ReaderProfilePage, {
        me: { reader_profile: { display_name: "Ana", slug: "ana", description: "", is_public: false, favorite_genres: [], traits: {} }, author_profile: null },
        refreshMe: async () => {},
        locationSearch: "?section=info",
      }));
      assert.match(activePageMarkup, /Autor\/a<\/a>/);
      assert.match(activePageMarkup, /Tu perfil de autor\/a está activo/);
      assert.match(inactiveInfoMarkup, /Publicá tus libros en Bookia/);
      assert.match(inactiveInfoMarkup, /href="\/profile\?section=author"/);
    } finally {
      await vite.close();
    }
  });
}
