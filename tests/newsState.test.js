import assert from "node:assert/strict";

import {
  buildNewsFormData,
  createNewsDraft,
  displayNewsDate,
  getActiveNewsCount,
  getNewsImageValidationError,
  getPublicNewsItems,
  newsCategoryLabel,
} from "../src/newsState.js";

export function registerNewsStateTests(test) {
test("builds a news multipart payload including an explicit image removal", () => {
  const payload = buildNewsFormData({
    category: "event",
    title: "  Encuentro con autoras  ",
    description: "  Una tarde para conversar.  ",
    event_date: "2026-09-20",
    image: null,
    remove_image: true,
  });

  assert.deepEqual([...payload.entries()].map(([key, value]) => [key, value instanceof Blob ? value.type : value]), [
    ["category", "event"],
    ["title", "Encuentro con autoras"],
    ["description", "Una tarde para conversar."],
    ["event_date", "2026-09-20"],
    ["remove_image", "true"],
  ]);
});

test("does not submit an image upload when the draft removes its existing image", () => {
  const payload = buildNewsFormData({
    category: "news",
    title: "Nueva selección",
    description: "Elijo quitar la imagen actual.",
    event_date: "",
    image: new Blob(["replacement"], { type: "image/png" }),
    remove_image: true,
  });

  assert.equal(payload.has("image"), false);
  assert.equal(payload.get("remove_image"), "true");
});

test("sends the API clear flag when an editor removes an optional event date", () => {
  const payload = buildNewsFormData({
    category: "event",
    title: "Evento sin fecha",
    description: "La fecha se confirmará luego.",
    event_date: "",
    image: null,
    remove_image: false,
  });

  assert.equal(payload.get("event_date"), "");
  assert.equal(payload.get("clear_event_date"), "true");
});

test("creates editable defaults and formats news metadata for readers", () => {
  assert.deepEqual(createNewsDraft(), {
    id: null,
    category: "news",
    title: "",
    description: "",
    event_date: "",
    image_url: null,
    image: null,
    remove_image: false,
  });
  assert.equal(newsCategoryLabel("offer"), "Oferta");
  assert.equal(newsCategoryLabel("event"), "Evento");
  assert.equal(newsCategoryLabel("news"), "Novedad");
  assert.equal(displayNewsDate("2026-09-20"), "20/09/2026");
  assert.equal(displayNewsDate(null), "");
});

test("keeps at most three active news items for the public storefront", () => {
  assert.deepEqual(
    getPublicNewsItems([
      { id: 4, is_active: true },
      { id: 3, is_active: false },
      { id: 2, is_active: true },
      { id: 1, is_active: true },
      { id: 0, is_active: true },
    ]).map((item) => item.id),
    [4, 2, 1],
  );
});

test("counts active news for the dashboard publishing limit", () => {
  assert.equal(getActiveNewsCount([{ is_active: true }, { is_active: false }, { is_active: true }, { is_active: true }]), 3);
});

test("validates optional news images before upload", () => {
  assert.equal(getNewsImageValidationError(null), "");
  assert.equal(getNewsImageValidationError(new Blob(["cover"], { type: "image/webp" })), "");
  assert.equal(getNewsImageValidationError(new Blob(["cover"], { type: "image/gif" })), "La imagen debe ser PNG, JPEG o WebP.");
  assert.equal(getNewsImageValidationError({ type: "image/png", size: 5 * 1024 * 1024 + 1 }), "La imagen no puede superar los 5 MB.");
});
}
