import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import {
  buildProfileFormData,
  createProfileDraft,
  displayBookstoreDescription,
  removeProfileImage,
  requireRefreshedBookstore,
  selectProfileImage,
} from "../src/profileEditorState.js";
import { buildRequestHeaders } from "../src/api.js";

export function registerProfileEditorStateTests(test) {
  test("uses the exact fallback for missing bookstore descriptions", () => {
    assert.equal(displayBookstoreDescription(null), "Sin descripción");
    assert.equal(displayBookstoreDescription(""), "Sin descripción");
    assert.equal(displayBookstoreDescription("   "), "Sin descripción");
    assert.equal(displayBookstoreDescription("  Especializada  "), "Especializada");
  });

  test("creates a clean profile draft from a bookstore", () => {
    assert.deepEqual(createProfileDraft({ description: "  Libros únicos  " }), {
      description: "  Libros únicos  ",
      logoFile: null,
      bannerFile: null,
      removeLogo: false,
      removeBanner: false,
    });
    assert.equal(createProfileDraft({ description: null }).description, "");
  });

  test("removing an image clears its selected file immutably", () => {
    const logo = new Blob(["logo"], { type: "image/png" });
    const draft = { ...createProfileDraft({}), logoFile: logo };
    const nextDraft = removeProfileImage(draft, "logo");

    assert.notEqual(nextDraft, draft);
    assert.equal(nextDraft.logoFile, null);
    assert.equal(nextDraft.removeLogo, true);
    assert.equal(draft.logoFile, logo);
  });

  test("selecting a replacement image clears its removal flag", () => {
    const banner = new Blob(["banner"], { type: "image/jpeg" });
    const draft = { ...createProfileDraft({}), removeBanner: true };
    const nextDraft = selectProfileImage(draft, "banner", banner);

    assert.notEqual(nextDraft, draft);
    assert.equal(nextDraft.bannerFile, banner);
    assert.equal(nextDraft.removeBanner, false);
    assert.equal(draft.removeBanner, true);
  });

  test("builds profile multipart data with description, flags, and selected files", () => {
    const logo = new Blob(["logo"], { type: "image/png" });
    const banner = new Blob(["banner"], { type: "image/jpeg" });
    const formData = buildProfileFormData({
      description: "Especializada",
      logoFile: logo,
      bannerFile: banner,
      removeLogo: false,
      removeBanner: true,
    });

    assert.equal(formData.get("description"), "Especializada");
    assert.equal(formData.get("remove_logo"), "false");
    assert.equal(formData.get("remove_banner"), "true");
    assert.equal(formData.get("logo").size, logo.size);
    assert.equal(formData.get("banner").size, banner.size);
  });

  test("omits image fields from multipart data when no files are selected", () => {
    const formData = buildProfileFormData(createProfileDraft({ description: "Especializada" }));

    assert.equal(formData.has("logo"), false);
    assert.equal(formData.has("banner"), false);
  });

  test("requires a bookstore in the refreshed session result", () => {
    const bookstore = { id: 7, name: "Libreria Sur" };

    assert.equal(requireRefreshedBookstore({ bookstore }), bookstore);
  });

  test("rejects refresh results without a bookstore", () => {
    const expected = { message: "No pudimos actualizar los datos de la librer\u00eda." };

    assert.throws(() => requireRefreshedBookstore(null), expected);
    assert.throws(() => requireRefreshedBookstore({}), expected);
  });

  test("integrates the profile editor and shared description fallback", () => {
    const appSource = readFileSync(new URL("../src/App.jsx", import.meta.url), "utf8");
    const dashboardSource = readFileSync(new URL("../src/pages/DashboardPage.jsx", import.meta.url), "utf8");
    const publicPagesSource = readFileSync(new URL("../src/pages/PublicPages.jsx", import.meta.url), "utf8");

    assert.match(appSource, /function\s+refreshMe\s*\(\s*\{\s*preserveOnError\s*=\s*false\s*\}\s*=\s*\{\s*\}\s*\)/);
    assert.match(appSource, /if\s*\(\s*!preserveOnError\s*\)\s*\{\s*setMe\(\s*null\s*\)\s*;?\s*\}/s);
    assert.match(dashboardSource, /import\s+BookstoreProfileEditor\s+from\s+["']\.\.\/components\/BookstoreProfileEditor["']/);
    assert.match(dashboardSource, /<BookstoreProfileEditor\b[^>]*\bonSaved\s*=\s*\{\s*\(\s*\)\s*=>\s*refreshMe\(\s*\{\s*preserveOnError\s*:\s*true\s*\}\s*\)\s*\}/s);
    assert.match(publicPagesSource, /import\s*\{[^}]*\bdisplayBookstoreDescription\b[^}]*\}\s*from\s*["']\.\.\/profileEditorState["']/s);
    assert.match(publicPagesSource, /displayBookstoreDescription\(\s*store\.description\s*\)/);
  });

  test("hides profile images until the editor is opened", () => {
    const editorSource = readFileSync(new URL("../src/components/BookstoreProfileEditor.jsx", import.meta.url), "utf8");
    const closedStart = editorSource.indexOf("if (!isEditing)");
    const editingStart = editorSource.indexOf("<form onSubmit={saveProfile}>", closedStart);
    const closedStateSource = editorSource.slice(closedStart, editingStart);

    assert.ok(closedStart >= 0);
    assert.ok(editingStart > closedStart);
    assert.doesNotMatch(closedStateSource, /bookstore-profile-media-grid/);
    assert.doesNotMatch(closedStateSource, /Sin logo/);
    assert.doesNotMatch(closedStateSource, /Sin banner/);
  });
  test("keeps profile image upload actions visible and explicit", () => {
    const editorSource = readFileSync(new URL("../src/components/BookstoreProfileEditor.jsx", import.meta.url), "utf8");

    assert.match(editorSource, /Subir logo/);
    assert.match(editorSource, /Cambiar logo/);
    assert.match(editorSource, /Subir banner/);
    assert.match(editorSource, /Cambiar banner/);
    assert.match(editorSource, /htmlFor=/);
    assert.match(editorSource, /id=\{`bookstore-profile-logo-upload/);
    assert.match(editorSource, /id=\{`bookstore-profile-banner-upload/);
  });
  test("renders public bookstore banners with only a neutral readability overlay", () => {
    const publicPagesSource = readFileSync(new URL("../src/pages/PublicPages.jsx", import.meta.url), "utf8");

    assert.match(publicPagesSource, /backgroundImage:\s*`linear-gradient\(90deg, rgba\(0,0,0,\.42\), rgba\(0,0,0,\.18\)\), url\(\$\{heroImageUrl\}\)`/);
    assert.doesNotMatch(publicPagesSource, /rgba\(11,45,36/);
    assert.doesNotMatch(publicPagesSource, /rgba\(18,63,50/);
  });
  test("opens public bookstore book details from clickable cards", () => {
    const publicPagesSource = readFileSync(new URL("../src/pages/PublicPages.jsx", import.meta.url), "utf8");

    assert.match(publicPagesSource, /const \[selectedBook, setSelectedBook\] = useState\(null\)/);
    assert.match(publicPagesSource, /onClick=\{\(\) => setSelectedBook\(item\)\}/);
    assert.match(publicPagesSource, /role="dialog"/);
    assert.match(publicPagesSource, /aria-modal="true"/);
    assert.match(publicPagesSource, /event\.key === "Escape"/);
    assert.match(publicPagesSource, /book-card-description/);
    assert.match(publicPagesSource, /item\.genres\?\.length/);
    assert.match(publicPagesSource, /Sin genero/);
    assert.match(publicPagesSource, /BOOK_STATUS_LABELS/);
  });
  test("marks featured books in the public bookstore view and detail modal", () => {
    const publicPagesSource = readFileSync(new URL("../src/pages/PublicPages.jsx", import.meta.url), "utf8");
    const editorialSource = readFileSync(new URL("../src/editorial.css", import.meta.url), "utf8");

    assert.match(publicPagesSource, /item\.is_featured \? <span className="status-pill status-featured">Destacado<\/span> : null/);
    assert.match(publicPagesSource, /selectedBook\.is_featured \? <span className="status-pill status-featured">Destacado<\/span> : null/);
    assert.match(editorialSource, /\.status-featured/);
  });
  test("does not set a JSON content type for FormData", () => {
    const headers = buildRequestHeaders({ body: new FormData() }, "csrf-token");
    assert.equal(headers["Content-Type"], undefined);
  });

  test("sets a JSON content type for a JSON body", () => {
    const headers = buildRequestHeaders({ body: JSON.stringify({ description: "Nueva" }) }, "");
    assert.equal(headers["Content-Type"], "application/json");
  });

  test("preserves CSRF and custom request headers", () => {
    const headers = buildRequestHeaders(
      { body: JSON.stringify({}), headers: { "X-Custom": "custom-value" } },
      "csrf-token",
    );

    assert.equal(headers["X-CSRF-Token"], "csrf-token");
    assert.equal(headers["X-Custom"], "custom-value");
  });
}
