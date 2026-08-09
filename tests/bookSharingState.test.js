import assert from "node:assert/strict";

import { buildBookShareMessage, buildBookShareUrl, buildTelegramShareHref, buildWhatsAppShareHref, copyBookShareUrl, getSharedBookId, shareBookToInstagram } from "../src/bookSharingState.js";

export function registerBookSharingStateTests(register) {
  register("builds a canonical bookstore book-share URL", () => {
    assert.equal(
      buildBookShareUrl({ origin: "https://bookia.app", basePath: "/", bookstoreSlug: "libros-del-pasaje", itemId: 42 }),
      "https://bookia.app/bookstores/libros-del-pasaje?book=42",
    );
  });

  register("builds a share message with the book and bookstore identity", () => {
    assert.equal(
      buildBookShareMessage({ title: "Rayuela", author: "Julio Cortazar", bookstoreName: "Libros del Pasaje" }),
      "Mira \"Rayuela\" de Julio Cortazar en Libros del Pasaje en Bookia.",
    );
  });

  register("builds a WhatsApp share link with the complete message and URL", () => {
    assert.equal(
      buildWhatsAppShareHref({ text: "Mira Rayuela.", url: "https://bookia.app/bookstores/libros-del-pasaje?book=42" }),
      "https://wa.me/?text=Mira%20Rayuela.%0Ahttps%3A%2F%2Fbookia.app%2Fbookstores%2Flibros-del-pasaje%3Fbook%3D42",
    );
  });

  register("builds a Telegram share link with the complete message and URL", () => {
    assert.equal(
      buildTelegramShareHref({ text: "Mira Rayuela.", url: "https://bookia.app/bookstores/libros-del-pasaje?book=42" }),
      "https://t.me/share/url?url=https%3A%2F%2Fbookia.app%2Fbookstores%2Flibros-del-pasaje%3Fbook%3D42&text=Mira%20Rayuela.",
    );
  });

  register("returns only a positive integer shared book ID", () => {
    assert.equal(getSharedBookId("?book=42"), 42);
    assert.equal(getSharedBookId("?book=0"), null);
    assert.equal(getSharedBookId("?book=4.2"), null);
    assert.equal(getSharedBookId("?book=invalid"), null);
  });

  register("uses native sharing for the Instagram action when available", async () => {
    const payloads = [];
    const result = await shareBookToInstagram({
      title: "Rayuela",
      text: "Mira Rayuela.",
      url: "https://bookia.app/bookstores/libros-del-pasaje?book=42",
      navigatorLike: { share: async (payload) => { payloads.push(payload); } },
      copy: async () => { throw new Error("copy should not run"); },
    });

    assert.equal(result, "shared");
    assert.deepEqual(payloads, [{ title: "Rayuela", text: "Mira Rayuela.", url: "https://bookia.app/bookstores/libros-del-pasaje?book=42" }]);
  });

  register("copies the book URL when native sharing is unavailable", async () => {
    const copied = [];
    const result = await shareBookToInstagram({
      title: "Rayuela",
      text: "Mira Rayuela.",
      url: "https://bookia.app/bookstores/libros-del-pasaje?book=42",
      navigatorLike: {},
      copy: async (url) => { copied.push(url); },
    });

    assert.equal(result, "copied");
    assert.deepEqual(copied, ["https://bookia.app/bookstores/libros-del-pasaje?book=42"]);
  });

  register("copies a share URL through the provided clipboard", async () => {
    const copied = [];
    await copyBookShareUrl("https://bookia.app/bookstores/libros-del-pasaje?book=42", { writeText: async (url) => { copied.push(url); } });
    assert.deepEqual(copied, ["https://bookia.app/bookstores/libros-del-pasaje?book=42"]);
  });
}
