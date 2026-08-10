import assert from "node:assert/strict";

import { buildBookShareMessage, buildBookShareUrl, buildInstagramStoryCoverPath, buildInstagramStoryMetadata, buildTelegramShareHref, buildWhatsAppShareHref, copyBookShareUrl, getSharedBookId, loadInstagramStoryCover, loadInstagramStoryLogo, shareBookToInstagram, shareInstagramStoryFile } from "../src/bookSharingState.js";

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

  register("builds compact, complete metadata for an Instagram Story", () => {
    assert.deepEqual(
      buildInstagramStoryMetadata({
        item: { title: "Las cosas que perdimos en el fuego", author: "Mariana Enriquez", availability_status: "available", publisher: "Anagrama", language: "Español", book_status: "nuevo", genres: [{ name: "Terror" }, { name: "Cuentos" }] },
        bookstore: { name: "Eterna Cadencia" },
      }),
      {
        title: "Las cosas que perdimos en el fuego",
        author: "Mariana Enriquez",
        availability: "Disponible",
        genre: "Terror, Cuentos",
        publisher: "Anagrama",
        language: "Español",
        bookStatus: "Nuevo",
        bookstoreName: "Eterna Cadencia",
        callToAction: "ENCONTRALO EN ETERNA CADENCIA",
      },
    );
  });

  register("uses visible fallbacks and truncates overflowing Story metadata", () => {
    const metadata = buildInstagramStoryMetadata({
      item: { title: "Un título extraordinariamente largo que no debe invadir toda la Story", author: "", availability_status: "reserved", publisher: "", language: "", book_status: "usado", genres: [] },
      bookstore: { name: "" },
    });

    assert.equal(metadata.title, "Un título extraordinariamente largo que no debe invadir…");
    assert.equal(metadata.author, "Autor no visible");
    assert.equal(metadata.availability, "Reservado");
    assert.equal(metadata.genre, "Sin género");
    assert.equal(metadata.publisher, "Editorial no visible");
    assert.equal(metadata.language, "Idioma no visible");
    assert.equal(metadata.bookStatus, "Usado");
    assert.equal(metadata.callToAction, "ENCONTRALO EN BOOKIA");
  });

  register("shares the generated Story file when the device supports file sharing", async () => {
    const file = new Blob(["story"], { type: "image/png" });
    const payloads = [];
    const result = await shareInstagramStoryFile({
      file,
      title: "Rayuela",
      navigatorLike: {
        canShare: ({ files }) => files[0] === file,
        share: async (payload) => { payloads.push(payload); },
      },
      download: () => { throw new Error("download should not run"); },
    });

    assert.equal(result, "shared");
    assert.deepEqual(payloads, [{ files: [file], title: "Rayuela" }]);
  });

  register("downloads the generated Story file when file sharing is unavailable", async () => {
    const file = new Blob(["story"], { type: "image/png" });
    const downloads = [];
    const result = await shareInstagramStoryFile({
      file,
      title: "Rayuela",
      navigatorLike: {},
      download: (storyFile) => { downloads.push(storyFile); },
    });

    assert.equal(result, "downloaded");
    assert.deepEqual(downloads, [file]);
  });

  register("does not download a Story after the person cancels native sharing", async () => {
    const file = new Blob(["story"], { type: "image/png" });
    const result = await shareInstagramStoryFile({
      file,
      title: "Rayuela",
      navigatorLike: {
        canShare: () => true,
        share: async () => { const error = new Error("cancelled"); error.name = "AbortError"; throw error; },
      },
      download: () => { throw new Error("download should not run"); },
    });

    assert.equal(result, "cancelled");
  });

  register("keeps the catalog source-cover route for a Story", () => {
    assert.equal(buildInstagramStoryCoverPath({ id: 42, cover_image_url: "/dashboard/catalog/42/cover" }), "/dashboard/catalog/42/cover");
  });

  register("keeps the public catalog cover route for a Story", () => {
    assert.equal(buildInstagramStoryCoverPath({ id: 42, cover_image_url: "/catalog/42/cover" }), "/catalog/42/cover");
  });

  register("keeps the catalog primary-gallery route for a Story", () => {
    assert.equal(buildInstagramStoryCoverPath({ id: 42, cover_image_url: "/dashboard/catalog/42/images/7" }), "/dashboard/catalog/42/images/7");
  });

  register("keeps API-prefixed and absolute catalog cover URLs for a Story", () => {
    assert.equal(buildInstagramStoryCoverPath({ id: 42, cover_image_url: "/api/dashboard/catalog/42/cover" }), "/api/dashboard/catalog/42/cover");
    assert.equal(buildInstagramStoryCoverPath({ id: 42, cover_image_url: "https://api.bookia.example/dashboard/catalog/42/images/7" }, { trustedOrigins: ["https://api.bookia.example"] }), "https://api.bookia.example/dashboard/catalog/42/images/7");
  });

  register("rejects a Story cover path that does not belong to the catalog item", () => {
    assert.equal(buildInstagramStoryCoverPath({ id: 42, cover_image_url: "/dashboard/catalog/43/images/7" }), null);
    assert.equal(buildInstagramStoryCoverPath({ id: 42, cover_image_url: "https://untrusted.example/cover.png" }), null);
    assert.equal(buildInstagramStoryCoverPath({ id: 42, cover_image_url: null }), null);
  });

  register("rejects a non-image cover response before downloading it", async () => {
    await assert.rejects(
      () => loadInstagramStoryCover({
        coverUrl: "/dashboard/catalog/42/cover",
        fetchLike: async () => ({ ok: true, headers: new Headers({ "content-type": "text/html", "content-length": "1024" }) }),
        imageFactory: () => { throw new Error("image decoding should not start"); },
      }),
      /formato de imagen/i,
    );
  });

  register("rejects a cover response larger than the Story safety limit", async () => {
    await assert.rejects(
      () => loadInstagramStoryCover({
        coverUrl: "/dashboard/catalog/42/cover",
        fetchLike: async () => ({ ok: true, headers: new Headers({ "content-type": "image/png", "content-length": "10485761" }) }),
        imageFactory: () => { throw new Error("image decoding should not start"); },
      }),
      /demasiado grande/i,
    );
  });

  register("rejects oversized image dimensions before starting Story cover decoding", async () => {
    const pngHeader = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 13, 73, 72, 68, 82, 0, 0, 39, 16, 0, 0, 39, 16]);
    await assert.rejects(
      () => loadInstagramStoryCover({
        coverUrl: "/dashboard/catalog/42/cover",
        fetchLike: async () => ({ ok: true, headers: new Headers({ "content-type": "image/png", "content-length": String(pngHeader.byteLength) }), blob: async () => new Blob([pngHeader], { type: "image/png" }) }),
        imageFactory: () => { throw new Error("image decoding should not start"); },
      }),
      /demasiado grande/i,
    );
  });

  register("continues without a logo when the Story logo cannot load", async () => {
    let requestedSource = "";
    const image = {};
    Object.defineProperty(image, "src", { set(value) { requestedSource = value; queueMicrotask(() => image.onerror()); } });

    const logo = await loadInstagramStoryLogo({ imageFactory: () => image });

    assert.equal(logo, null);
    assert.equal(requestedSource, "/images/logo-cuadrado.png");
  });
}
