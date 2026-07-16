import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import {
  buildCatalogItemUpdatePayload,
  hasCatalogItemAvailabilityChanged,
} from "../src/dashboardCatalogState.js";

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
}