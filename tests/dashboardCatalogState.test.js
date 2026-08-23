import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import * as dashboardCatalogState from "../src/dashboardCatalogState.js";

const {
  buildCatalogItemUpdatePayload,
  buildCatalogSaveErrorMessage,
  hasCatalogItemAvailabilityChanged,
} = dashboardCatalogState;

export function registerDashboardCatalogStateTests(register) {
  register("omits unchanged empty legacy author when editing another field", () => {
    const original = {
      title: "libro legacy",
      author: "",
      publisher: "editorial original",
      language: "es",
      description: "",
      genre_ids: [],
      book_status: "usado",
      availability_status: "available",
    };
    const draft = {
      title: "libro legacy",
      author: "",
      publisher: "editorial nueva",
      language: "es",
      description: "descripcion nueva",
      genre_ids: [],
      book_status: "usado",
      availability_status: "available",
    };

    assert.deepEqual(buildCatalogItemUpdatePayload(original, draft), {
      publisher: "editorial nueva",
      description: "descripcion nueva",
    });
  });

  register("includes an emptied existing author so the API can reject it", () => {
    const original = {
      title: "rayuela",
      author: "julio cortazar",
      publisher: "sudamericana",
      language: "es",
      description: "",
      genre_ids: [],
      book_status: "usado",
      availability_status: "available",
    };
    const draft = {
      ...original,
      author: "",
    };

    assert.deepEqual(buildCatalogItemUpdatePayload(original, draft), {
      author: "",
    });
  });

  register("sends null when optional catalog fields are cleared", () => {
    const original = {
      title: "rayuela",
      author: "julio cortazar",
      publisher: "sudamericana",
      language: "es",
      description: "novela",
      genre_ids: [7],
      book_status: "usado",
      availability_status: "available",
    };
    const draft = {
      ...original,
      publisher: "",
      language: "",
      description: "",
    };

    assert.deepEqual(buildCatalogItemUpdatePayload(original, draft), {
      publisher: null,
      language: null,
      description: null,
    });
  });


  register("dashboard save uses the differential catalog payload helper", () => {
    const source = readFileSync(new URL("../src/pages/DashboardPage.jsx", import.meta.url), "utf8");

    assert.match(source, /const payload = buildCatalogItemUpdatePayload\(item, draftItem\)/);
    assert.match(source, /hasCatalogItemAvailabilityChanged\(item, draftItem\)/);
    assert.match(source, /onClick=\{\(\) => saveItem\(item\)\}/);
  });

  register("dashboard applies AI autocomplete as an explicit replacement before saving", () => {
    const source = readFileSync(new URL("../src/pages/DashboardPage.jsx", import.meta.url), "utf8");

    assert.match(source, /mergeAiAutocompleteSuggestion\([^)]*\{ overwriteExisting: true \}\)/s);
  });
  register("dashboard AI autocomplete button uses a stable SVG icon", () => {
    const source = readFileSync(new URL("../src/pages/DashboardPage.jsx", import.meta.url), "utf8");

    assert.match(source, /import \{ ArrowIcon, BookIcon, SearchIcon, SparkleIcon \} from "\.\.\/components\/Icons"/);
    assert.match(source, /<SparkleIcon size=\{16\} \/>/);
    assert.doesNotMatch(source, /\\uD83E\\uDE84/);
  });

  register("highlights and sizes the dashboard AI autocomplete button to its content", () => {
    const source = readFileSync(new URL("../src/pages/DashboardPage.jsx", import.meta.url), "utf8");
    const editorialStyles = readFileSync(new URL("../src/editorial.css", import.meta.url), "utf8");

    assert.match(source, /className="secondary-button catalog-ai-autocomplete-button"/);
    const aiButtonRule = editorialStyles.match(/\.dashboard-list-active \.card-actions-main > \.catalog-ai-autocomplete-button\s*\{([^}]*)\}/s)?.[1] || "";
    assert.match(aiButtonRule, /flex:\s*0 1 auto;/);
    assert.match(aiButtonRule, /min-width:\s*max-content;/);
    assert.match(aiButtonRule, /white-space:\s*nowrap;/);
    assert.match(aiButtonRule, /color:\s*#fff;/);
    assert.match(aiButtonRule, /background:\s*var\(--coral\);/);
    assert.match(editorialStyles, /\.dashboard-list-active \.card-actions-main > \.catalog-ai-autocomplete-button:hover:not\(:disabled\)[^{]*\{[^}]*background:\s*var\(--coral-dark\);/s);
  });

  register("styles the catalog save button with the green action color", () => {
    const source = readFileSync(new URL("../src/pages/DashboardPage.jsx", import.meta.url), "utf8");
    const editorialStyles = readFileSync(new URL("../src/editorial.css", import.meta.url), "utf8");

    assert.match(source, /className="primary-button catalog-save-button"/);
    assert.match(editorialStyles, /\.dashboard-list-active \.card-actions-main > \.catalog-save-button\s*\{[^}]*color:\s*var\(--cream\);[^}]*background:\s*var\(--forest\);[^}]*border-color:\s*var\(--forest\);/s);
    assert.match(editorialStyles, /\.dashboard-list-active \.card-actions-main > \.catalog-save-button:hover:not\(:disabled\)[^{]*\{[^}]*background:\s*var\(--forest-deep\);/s);
  });

  register("confirms moving a catalog book to sold-out before changing availability", () => {
    const source = readFileSync(new URL("../src/pages/DashboardPage.jsx", import.meta.url), "utf8");
    const editorialStyles = readFileSync(new URL("../src/editorial.css", import.meta.url), "utf8");

    assert.match(source, /const \[pendingHideItem, setPendingHideItem\] = useState\(null\);/);
    assert.match(source, /onClick=\{\(\) => setPendingHideItem\(item\)\}/);
    assert.match(source, /className="danger-button catalog-hide-trigger"/);
    assert.match(source, /role="dialog" aria-modal="true"/);
    assert.match(source, /Mover a agotados/);
    assert.match(source, /updateAvailability\(pendingHideItem\.id, "hidden"/);
    assert.match(editorialStyles, /\.dashboard-list-active \.card-actions > \.catalog-hide-trigger\s*\{[^}]*flex:\s*0 1 auto;[^}]*min-width:\s*max-content;[^}]*white-space:\s*nowrap;/s);
    assert.ok(editorialStyles.indexOf(".dashboard-list-active .card-actions > .catalog-hide-trigger") > editorialStyles.lastIndexOf(".dashboard-list-active .card-actions > .danger-button"));
  });


  register("saves description and genre produced by an AI-applied draft", () => {
    const original = {
      title: "rayuela",
      author: "julio cortazar",
      publisher: "sudamericana",
      language: "es",
      description: "descripcion vieja",
      genre_ids: [7],
      book_status: "usado",
      availability_status: "available",
    };
    const draft = {
      ...original,
      description: "descripcion ia",
      genre_ids: [12],
    };

    assert.deepEqual(buildCatalogItemUpdatePayload(original, draft), {
      description: "descripcion ia",
      genre_ids: [12],
    });
  });
  register("keeps availability out of catalog patch and detects separate availability update", () => {
    const original = {
      title: "rayuela",
      author: "julio cortazar",
      publisher: "",
      language: "",
      description: "",
      genre_ids: [],
      book_status: "usado",
      availability_status: "available",
    };
    const draft = {
      ...original,
      availability_status: "hidden",
    };

    assert.deepEqual(buildCatalogItemUpdatePayload(original, draft), {});
    assert.equal(hasCatalogItemAvailabilityChanged(original, draft), true);
  });
  register("explains that an AI suggestion remains editable after a save failure", () => {
    assert.equal(buildCatalogSaveErrorMessage("No pudimos guardar los cambios del libro."), "No pudimos guardar los cambios del libro. La sugerencia de IA sigue en el formulario para que puedas reintentar.");
    const source = readFileSync(new URL("../src/pages/DashboardPage.jsx", import.meta.url), "utf8");
    assert.match(source, /const \[saveBusyItemId, setSaveBusyItemId\] = useState\(null\)/);
    assert.match(source, /const \[saveErrorsByItemId, setSaveErrorsByItemId\] = useState\(\{\}\)/);
    assert.match(source, /setSaveBusyItemId\(item\.id\)/);
    assert.match(source, /saveErrorsByItemId\[item\.id\]/);
    assert.match(source, /role="alert"/);
  });

  register("locks catalog actions while any book save is pending", () => {
    const { getCatalogSaveUiState } = dashboardCatalogState;
    assert.equal(typeof getCatalogSaveUiState, "function");
    assert.deepEqual(getCatalogSaveUiState(20, 20), {
      isSavePending: true,
      isCurrentItemSaving: true,
    });
    assert.deepEqual(getCatalogSaveUiState(20, 21), {
      isSavePending: true,
      isCurrentItemSaving: false,
    });
    assert.deepEqual(getCatalogSaveUiState(null, 21), {
      isSavePending: false,
      isCurrentItemSaving: false,
    });

    const source = readFileSync(new URL("../src/pages/DashboardPage.jsx", import.meta.url), "utf8");
    assert.match(source, /const \[catalogActionBusy, setCatalogActionBusy\] = useState\(false\)/);
    assert.match(source, /const catalogMutationBusy = catalogActionBusy \|\| saveBusyItemId !== null \|\| aiBusyId !== null \|\| imageBusyId !== null/);
    assert.match(source, /setCatalogActionBusy\(true\)/);
    assert.match(source, /\.finally\(\(\) => setCatalogActionBusy\(false\)\)/);
    assert.match(source, /setSaveBusyItemId\(\(current\) => current === item\.id \? null : current\)/);
    assert.match(source, /const catalogActionsBusy = catalogMutationBusy/);
    assert.match(source, /<fieldset className="dashboard-form-grid dashboard-form-grid-extended catalog-edit-fields" disabled=\{catalogActionsBusy\}>/);
    assert.match(source, /disabled=\{catalogActionsBusy\}/);
    assert.match(source, /if \(catalogMutationBusy\) return;/);
    assert.match(source, /disabled=\{catalogActionsBusy \|\| imageBusyId === item\.id\}/);
    assert.match(source, /disabled=\{catalogMutationBusy\}>Volver a publicar/);
  });

}
