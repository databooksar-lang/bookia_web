import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import {
  buildProfileFormData,
  createProfileDraft,
  displayBookstoreDescription,
  formatDescriptionSelection,
  getBookstoreTagOptions,
  removeProfileImage,
  requireRefreshedBookstore,
  selectProfileImage,
  setProfileDraftField,
} from "../src/profileEditorState.js";
import { buildRequestHeaders } from "../src/api.js";
import { buildWhatsAppHref } from "../src/formatters.js";

export function registerProfileEditorStateTests(test) {
  test("formats the selected description text without losing its selection", () => {
    assert.deepEqual(
      formatDescriptionSelection("Una libreria", 4, 12, "bold"),
      { value: "Una **libreria**", selectionStart: 6, selectionEnd: 14 },
    );
    assert.deepEqual(
      formatDescriptionSelection("Talleres\nClubes", 0, 15, "unorderedList"),
      { value: "- Talleres\n- Clubes", selectionStart: 0, selectionEnd: 19 },
    );
  });

  test("formats safe links and rejects unsupported link protocols", () => {
    assert.deepEqual(
      formatDescriptionSelection("Visitanos", 0, 9, "link", "https://libreria.example"),
      { value: "[Visitanos](https://libreria.example/)", selectionStart: 1, selectionEnd: 10 },
    );
    assert.equal(formatDescriptionSelection("Visitanos", 0, 9, "link", "javascript:alert(1)"), null);
  });
  test("offers active genres as distinct bookstore tag options and keeps a legacy value selectable", () => {
    const genres = [
      { id: 1, name: "Narrativa" },
      { id: 2, name: "Poesia" },
      { id: 3, name: "Infantil" },
    ];

    assert.deepEqual(
      getBookstoreTagOptions(genres, "Narrativa", "Poesia"),
      [
        { value: "Narrativa", label: "Narrativa" },
        { value: "Infantil", label: "Infantil" },
      ],
    );
    assert.deepEqual(
      getBookstoreTagOptions(genres, "Historieta", "Poesia"),
      [
        { value: "Historieta", label: "Historieta (ya no disponible)" },
        { value: "Narrativa", label: "Narrativa" },
        { value: "Infantil", label: "Infantil" },
      ],
    );
  });

  test("uses the exact fallback for missing bookstore descriptions", () => {
    assert.equal(displayBookstoreDescription(null), "Sin descripción");
    assert.equal(displayBookstoreDescription(""), "Sin descripción");
    assert.equal(displayBookstoreDescription("   "), "Sin descripción");
    assert.equal(displayBookstoreDescription("  Especializada  "), "Especializada");
  });

  test("creates a clean profile draft from a bookstore", () => {
    assert.deepEqual(createProfileDraft({ description: "  Libros únicos  " }), {
      description: "  Libros únicos  ",
      tag1: "",
      tag2: "",
      address: "",
      contactEmail: "",
      whatsappPhone: "",
      instagramHandle: "",
      facebookHandle: "",
      websiteUrl: "",
      bookstoreType: "",
      logoFile: null,
      bannerFile: null,
      removeLogo: false,
      removeBanner: false,
    });
    assert.equal(createProfileDraft({ description: null }).description, "");
  });

  test("creates a profile draft with every public bookstore field", () => {
    const draft = createProfileDraft({
      tag_1: "Usados",
      tag_2: "Barrio",
      address: "Corrientes 123",
      correo: "hola@example.com",
      whatsapp_phone: "5491122223333",
      instagram_handle: "bookia.libros",
      facebook_handle: "bookia.libros",
      website_url: "https://bookia.example",
      bookstore_type: "virtual",
    });

    assert.equal(draft.tag1, "Usados");
    assert.equal(draft.contactEmail, "hola@example.com");
    assert.equal(draft.whatsappPhone, "5491122223333");
    assert.equal(draft.facebookHandle, "bookia.libros");
    assert.equal(draft.websiteUrl, "https://bookia.example");
    assert.equal(draft.bookstoreType, "virtual");
  });

  test("builds WhatsApp links only from canonical Argentine mobile values", () => {
    assert.equal(buildWhatsAppHref("5491112345678"), "https://wa.me/5491112345678");
    assert.equal(buildWhatsAppHref("541199990000"), null);
    assert.equal(buildWhatsAppHref("+54 9 11 1234-5678"), null);
    assert.equal(buildWhatsAppHref(""), null);
  });

  test("encodes a prefilled WhatsApp message for a book inquiry", () => {
    assert.equal(
      buildWhatsAppHref("5491112345678", "Hola, quisiera consultarte por el libro El Aleph: edición \"especial\" & otros que vi publicado en Bookia."),
      "https://wa.me/5491112345678?text=Hola%2C%20quisiera%20consultarte%20por%20el%20libro%20El%20Aleph%3A%20edici%C3%B3n%20%22especial%22%20%26%20otros%20que%20vi%20publicado%20en%20Bookia.",
    );
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
      ...createProfileDraft({
        description: "Especializada",
        tag_1: "Curada",
        correo: "hola@example.com",
        whatsapp_phone: "5491122223333",
        facebook_handle: "bookia.libros",
        bookstore_type: "physical",
      }),
      logoFile: logo,
      bannerFile: banner,
      removeLogo: false,
      removeBanner: true,
    });

    assert.equal(formData.get("description"), "Especializada");
    assert.equal(formData.get("tag_1"), "Curada");
    assert.equal(formData.get("correo"), "hola@example.com");
    assert.equal(formData.has("phone_country_cd"), false);
    assert.equal(formData.has("phone"), false);
    assert.equal(formData.get("whatsapp_phone"), "5491122223333");
    assert.equal(formData.get("facebook_handle"), "bookia.libros");
    assert.equal(formData.get("bookstore_type"), "physical");
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

  test("uses the rich description editor and renderer in dashboard and storefront", () => {
    const editorSource = readFileSync(new URL("../src/components/BookstoreProfileEditor.jsx", import.meta.url), "utf8");
    const richEditorSource = readFileSync(new URL("../src/components/RichDescriptionEditor.jsx", import.meta.url), "utf8");
    const publicPagesSource = readFileSync(new URL("../src/pages/PublicPages.jsx", import.meta.url), "utf8");
    const editorialSource = readFileSync(new URL("../src/editorial.css", import.meta.url), "utf8");

    assert.match(editorSource, /BookstoreDescription/);
    assert.match(editorSource, /RichDescriptionEditor/);
    assert.match(richEditorSource, /description-toolbar/);
    assert.match(richEditorSource, /Negrita/);
    assert.match(richEditorSource, /Cursiva/);
    assert.match(richEditorSource, /Insertar enlace/);
    assert.match(richEditorSource, /Lista con viñetas/);
    assert.match(richEditorSource, /Lista numerada/);
    assert.match(richEditorSource, /Vista previa/);
    assert.match(richEditorSource, /formatDescriptionSelection/);
    assert.match(publicPagesSource, /BookstoreDescription/);
    assert.match(editorialSource, /\.description-toolbar/);
    assert.match(editorialSource, /\.bookstore-description/);
  });

  test("uses the dashboard genre request for distinct bookstore tag dropdowns", () => {
    const dashboardSource = readFileSync(new URL("../src/pages/DashboardPage.jsx", import.meta.url), "utf8");
    const editorSource = readFileSync(new URL("../src/components/BookstoreProfileEditor.jsx", import.meta.url), "utf8");

    assert.match(dashboardSource, /<BookstoreProfileEditor\b[^>]*\bgenres=\{genres\}[^>]*\bgenresLoading=\{genresLoading\}[^>]*\bgenresError=\{genresError\}/s);
    assert.match(editorSource, /getBookstoreTagOptions/);
    assert.match(editorSource, /getGenreSelectorState/);
    assert.match(editorSource, /<select[^>]*value=\{value\}/);
    assert.match(editorSource, /Sin etiqueta/);
    assert.match(editorSource, /otherValue/);
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
  test("groups every editable public bookstore field in the profile editor", () => {
    const editorSource = readFileSync(new URL("../src/components/BookstoreProfileEditor.jsx", import.meta.url), "utf8");
    const editorialSource = readFileSync(new URL("../src/editorial.css", import.meta.url), "utf8");

    assert.match(editorSource, />Presentacion</);
    assert.match(editorSource, />Contacto</);
    assert.match(editorSource, />Presencia online</);
    assert.match(editorSource, />Identidad visual</);
    assert.match(editorSource, /draft\.contactEmail/);
    assert.match(editorSource, /draft\.whatsappPhone/);
    assert.match(editorSource, /draft\.facebookHandle/);
    assert.match(editorSource, /className="bookstore-profile-field-wide"><span>Tipo de libreria<\/span><select/);
    assert.doesNotMatch(editorSource, /setUsePhoneForWhatsApp/);
    assert.match(editorSource, /bookstore-profile-summary-grid/);
    assert.match(editorSource, /Datos por completar/);
    assert.match(editorialSource, /\.bookstore-profile-group/);
    assert.match(editorialSource, /\.bookstore-profile-summary-grid/);
  });
  test("renders public bookstore banner separately from the green profile panel", () => {
    const publicPagesSource = readFileSync(new URL("../src/pages/PublicPages.jsx", import.meta.url), "utf8");
    const editorialSource = readFileSync(new URL("../src/editorial.css", import.meta.url), "utf8");

    assert.match(publicPagesSource, /<div className=\{`store-hero\$\{heroImageUrl \? " has-hero" : ""\}`\} style=\{heroImageUrl \? \{ backgroundImage: `url\(\$\{heroImageUrl\}\)` \} : undefined\} \/>/);
    assert.match(publicPagesSource, /<div className="store-profile-panel">/);
    assert.match(publicPagesSource, /<div className="store-identity">/);
    assert.match(publicPagesSource, /<aside className="store-contact-card">/);
    assert.match(editorialSource, /\.store-profile-panel/);
    assert.match(editorialSource, /height:\s*clamp\(200px, 28vw, 340px\)/);
    assert.doesNotMatch(publicPagesSource, /linear-gradient\(90deg, rgba\(0,0,0/);
  });
  test("uses the dedicated WhatsApp and public email across public bookstore views", () => {
    const publicPagesSource = readFileSync(new URL("../src/pages/PublicPages.jsx", import.meta.url), "utf8");
    const commerceSource = readFileSync(new URL("../src/components/Commerce.jsx", import.meta.url), "utf8");

    assert.equal((publicPagesSource.match(/whatsappPhone=\{/g) || []).length, 4);
    assert.match(publicPagesSource, /mailto:\$\{store\.correo\}/);
    assert.match(commerceSource, /buildWhatsAppHref\(whatsappPhone, message\)/);
  });
  test("links a public bookstore address to Google Maps in a new secure tab", () => {
    const publicPagesSource = readFileSync(new URL("../src/pages/PublicPages.jsx", import.meta.url), "utf8");

    assert.match(publicPagesSource, /const mapsHref = buildGoogleMapsAddressUrl\(store\.address\)/);
    assert.match(publicPagesSource, /content: <ContactLink href=\{mapsHref\}>\{store\.address\.trim\(\)\}<\/ContactLink>/);
    assert.match(publicPagesSource, /function ContactLink\(\{ href, children \}\) \{\s*return <a href=\{href\} target="_blank" rel="noopener noreferrer">/);
  });
  test("opens public bookstore book details from clickable cards", () => {
    const publicPagesSource = readFileSync(new URL("../src/pages/PublicPages.jsx", import.meta.url), "utf8");

    assert.match(publicPagesSource, /const \[selectedBook, setSelectedBook\] = useState\(null\)/);
    assert.match(publicPagesSource, /function openBookDetail\(item\) \{[\s\S]*?setSelectedBook\(item\)/);
    assert.doesNotMatch(publicPagesSource, /function openBookDetail\(item\) \{\s*const gallery = bookImageGallery\(item\);\s*openBookDetail\(item\);/);
    assert.match(publicPagesSource, /onClick=\{\(\) => openBookDetail\(item\)\}/);
    assert.match(publicPagesSource, /role="dialog"/);
    assert.match(publicPagesSource, /aria-modal="true"/);
    assert.match(publicPagesSource, /event\.key === "Escape"/);
    assert.match(publicPagesSource, /book-card-description/);
    assert.match(publicPagesSource, /item\.genres\?\.length/);
    assert.match(publicPagesSource, /Sin genero/);
    assert.match(publicPagesSource, /BOOK_STATUS_LABELS/);
  });
  test("search results open the shared public book detail modal", () => {
    const publicPagesSource = readFileSync(new URL("../src/pages/PublicPages.jsx", import.meta.url), "utf8");
    const searchResultsStart = publicPagesSource.indexOf("function SearchResults");
    const searchResultsEnd = publicPagesSource.indexOf("function BenefitsStrip", searchResultsStart);
    const searchResultsSource = publicPagesSource.slice(searchResultsStart, searchResultsEnd);

    assert.ok(searchResultsStart >= 0);
    assert.ok(searchResultsEnd > searchResultsStart);
    assert.match(publicPagesSource, /function BookDetailModal\(/);
    assert.match(searchResultsSource, /const \[selectedBook, setSelectedBook\] = useState\(null\)/);
    assert.match(searchResultsSource, /className="search-result-book-button"/);
    assert.match(searchResultsSource, /onClick=\{\(\) => openBookDetail\(item\)\}/);
    assert.match(searchResultsSource, /<BookDetailModal/);
    assert.doesNotMatch(searchResultsSource, /selectedCover/);
    assert.doesNotMatch(searchResultsSource, /search-cover-modal/);
  });
  test("marks featured books in the public bookstore view and detail modal", () => {
    const publicPagesSource = readFileSync(new URL("../src/pages/PublicPages.jsx", import.meta.url), "utf8");
    const editorialSource = readFileSync(new URL("../src/editorial.css", import.meta.url), "utf8");

    assert.match(publicPagesSource, /item\.is_featured \? <span className="status-pill status-featured">Destacado<\/span> : null/);
    assert.match(publicPagesSource, /selectedBook\.is_featured \? <span className="status-pill status-featured">Destacado<\/span> : null/);
    assert.match(editorialSource, /\.status-featured/);
  });
  test("wraps active catalog actions without horizontal scrolling when space is limited", () => {
    const editorialSource = readFileSync(new URL("../src/editorial.css", import.meta.url), "utf8");

    const activeActionsRule = editorialSource.match(/\.dashboard-list-active \.card-actions\s*\{[^}]*\}/s)?.[0] || "";
    assert.match(activeActionsRule, /flex-wrap:\s*wrap;/);
    assert.doesNotMatch(activeActionsRule, /overflow-x:/);
    assert.match(activeActionsRule, /gap:\s*clamp\(/);
    assert.match(editorialSource, /\.dashboard-list-active \.card-actions-main\s*\{[^}]*width:\s*100%;[^}]*flex:\s*0 0 100%;[^}]*flex-wrap:\s*wrap;/s);
    assert.match(editorialSource, /\.dashboard-list-active \.card-actions > \.danger-button\s*\{[^}]*flex:\s*1 1 6rem;[^}]*min-width:\s*6rem;/s);
    assert.match(editorialSource, /\.dashboard-list-active \.card-actions-main > button,[\s\S]*?\.dashboard-list-active \.card-actions > \.danger-button\s*\{[^}]*flex:\s*1 1 6\.25rem;[^}]*min-width:\s*6\.25rem;[^}]*font-size:\s*clamp\(/s);
    assert.match(editorialSource, /\.dashboard-list-active \.card-actions-main > button:has\(svg\)\s*\{[^}]*flex:\s*2 1 16rem;[^}]*min-width:\s*16rem;/s);
    assert.doesNotMatch(editorialSource, /\.site-footer\s*\{\s*\.dashboard-list-active/);
    assert.match(editorialSource, /\.site-footer\s*\{\s*color: var\(--cream\);\s*background: var\(--forest-deep\);/);
  });
  test("dashboard catalog editor exposes gallery upload controls", () => {
    const dashboardSource = readFileSync(new URL("../src/pages/DashboardPage.jsx", import.meta.url), "utf8");

    assert.match(dashboardSource, /Fotos del libro/);
    assert.match(dashboardSource, /type="file"/);
    assert.match(dashboardSource, /multiple/);
    assert.match(dashboardSource, /accept="image\/png,image\/jpeg,image\/webp"/);
    assert.match(dashboardSource, /Marcar principal/);
    assert.match(dashboardSource, /Quitar foto/);
    assert.match(dashboardSource, /\/dashboard\/catalog\/\$\{itemId\}\/images/);
  });

  test("dashboard catalog current cover is shown without gallery actions", () => {
    const dashboardSource = readFileSync(new URL("../src/pages/DashboardPage.jsx", import.meta.url), "utf8");

    assert.match(dashboardSource, /image\.source === "current_cover"/);
    assert.match(dashboardSource, /image\.source === "catalog_image"/);
    assert.match(dashboardSource, /current_cover[\s\S]*Principal/);
  });
  test("public book detail modal renders a gallery when images are available", () => {
    const publicPagesSource = readFileSync(new URL("../src/pages/PublicPages.jsx", import.meta.url), "utf8");
    const editorialSource = readFileSync(new URL("../src/editorial.css", import.meta.url), "utf8");

    assert.match(publicPagesSource, /bookImageGallery\(selectedBook\)/);
    assert.match(publicPagesSource, /book-detail-gallery/);
    assert.match(publicPagesSource, /book-detail-thumbnails/);
    assert.match(publicPagesSource, /selectedBookImageUrl/);
    assert.match(editorialSource, /\.book-detail-gallery/);
    assert.match(editorialSource, /\.book-detail-thumbnails/);
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
