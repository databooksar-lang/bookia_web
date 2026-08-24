import assert from "node:assert/strict";

import * as bookSharingState from "../src/bookSharingState.js";

const { buildBookShareMessage, buildBookShareUrl, buildInstagramStoryCoverPath, buildInstagramStoryMetadata, buildTelegramShareHref, buildWhatsAppShareHref, copyBookShareUrl, getSharedBookId, loadInstagramStoryCover, shareBookToInstagram, shareInstagramStoryFile } = bookSharingState;

const PNG_HEADER = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 13, 73, 72, 68, 82, 0, 0, 2, 88, 0, 0, 3, 132]);

function createStoryImage(width, height) {
  const image = { width, height };
  Object.defineProperty(image, "src", { set() { queueMicrotask(() => image.onload()); } });
  return image;
}

function createStoryDocument(images = []) {
  const drawCalls = [];
  const filledArcs = [];
  const textCalls = [];
  const styledRectangles = [];
  let currentArc = null;
  const context = {
    arc(...args) { currentArc = args; }, beginPath() { currentArc = null; }, clip() {}, closePath() {}, fill() { if (currentArc) filledArcs.push({ args: currentArc, fillStyle: this.fillStyle }); }, lineTo() {}, moveTo() {}, quadraticCurveTo() {}, restore() {}, rotate() {}, save() {}, stroke() {}, strokeRect() {}, translate() {},
    drawImage(...args) { drawCalls.push(args); },
    fillRect(...args) { styledRectangles.push({ args, fillStyle: this.fillStyle }); },
    fillText(value, x, y) { textCalls.push({ value, x, y, fillStyle: this.fillStyle, font: this.font, textAlign: this.textAlign }); },
    measureText(value) {
      const fontSize = Number(String(this.font || "").match(/(\d+)px/)?.[1] || 40);
      return { width: String(value).length * fontSize * 0.5 };
    },
  };
  const canvas = { width: 0, height: 0, getContext: () => context, toBlob: (callback) => callback(new Blob(["story"], { type: "image/png" })) };
  const imageQueue = [...images];
  return {
    canvas,
    drawCalls,
    filledArcs,
    textCalls,
    styledRectangles,
    createElement(kind) {
      if (kind === "canvas") return canvas;
      if (imageQueue.length) return imageQueue.shift();
      const brokenImage = {};
      Object.defineProperty(brokenImage, "src", { set() { queueMicrotask(() => brokenImage.onerror()); } });
      return brokenImage;
    },
  };
}

class FakeFile {
  constructor(parts, name, options) {
    this.parts = parts;
    this.name = name;
    this.type = options.type;
  }
}

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
        callToAction: "VER EL LIBRO EN BOOKIA →",
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
    assert.equal(metadata.callToAction, "VER EL LIBRO EN BOOKIA →");
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

  register("downloads the Story when native sharing loses user activation", async () => {
    const file = new Blob(["story"], { type: "image/png" });
    const downloads = [];
    const result = await shareInstagramStoryFile({
      file,
      title: "Rayuela",
      navigatorLike: {
        canShare: () => true,
        share: async () => { const error = new Error("user activation required"); error.name = "NotAllowedError"; throw error; },
      },
      download: (storyFile) => { downloads.push(storyFile); },
    });

    assert.equal(result, "downloaded");
    assert.deepEqual(downloads, [file]);
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

  register("keeps only the bookstore logo route that belongs to the shared bookstore", () => {
    assert.equal(
      bookSharingState.buildInstagramStoryBookstoreLogoPath?.({ slug: "eterna-cadencia", logo_url: "/bookstores/eterna-cadencia/logo" }),
      "/bookstores/eterna-cadencia/logo",
    );
    assert.equal(
      bookSharingState.buildInstagramStoryBookstoreLogoPath?.({ slug: "eterna-cadencia", logo_url: "/api/bookstores/eterna-cadencia/logo" }),
      "/api/bookstores/eterna-cadencia/logo",
    );
    assert.equal(
      bookSharingState.buildInstagramStoryBookstoreLogoPath?.(
        { slug: "eterna-cadencia", logo_url: "https://api.bookia.example/bookstores/eterna-cadencia/logo" },
        { trustedOrigins: ["https://api.bookia.example"] },
      ),
      "https://api.bookia.example/bookstores/eterna-cadencia/logo",
    );
  });

  register("rejects mismatched and untrusted bookstore logos for a Story", () => {
    assert.equal(bookSharingState.buildInstagramStoryBookstoreLogoPath?.({ slug: "eterna-cadencia", logo_url: "/bookstores/otra-libreria/logo" }), null);
    assert.equal(
      bookSharingState.buildInstagramStoryBookstoreLogoPath?.(
        { slug: "eterna-cadencia", logo_url: "https://untrusted.example/bookstores/eterna-cadencia/logo" },
        { trustedOrigins: ["https://api.bookia.example"] },
      ),
      null,
    );
    assert.equal(bookSharingState.buildInstagramStoryBookstoreLogoPath?.({ slug: "eterna-cadencia", logo_url: null }), null);
  });

  register("resolves only validated cover and bookstore-logo assets for a Story", () => {
    const assets = bookSharingState.buildInstagramStoryAssetUrls?.({
      item: { id: 42, cover_image_url: "/dashboard/catalog/42/cover" },
      bookstore: { slug: "eterna-cadencia", logo_url: "/bookstores/otra-libreria/logo" },
      trustedOrigins: ["https://api.bookia.example"],
      resolveUrl: (path) => `https://api.bookia.example${path}`,
    });

    assert.deepEqual(assets, {
      coverUrl: "https://api.bookia.example/dashboard/catalog/42/cover",
      bookstoreLogoUrl: null,
    });
  });

  register("resolves API-prefixed Story assets without duplicating the external API prefix", () => {
    const assets = bookSharingState.buildInstagramStoryAssetUrls?.({
      item: { id: 42, cover_image_url: "/api/dashboard/catalog/42/cover" },
      bookstore: { slug: "eterna-cadencia", logo_url: "/api/bookstores/eterna-cadencia/logo" },
      resolveUrl: (path) => `https://api.bookia.example${path}`,
    });

    assert.deepEqual(assets, {
      coverUrl: "https://api.bookia.example/dashboard/catalog/42/cover",
      bookstoreLogoUrl: "https://api.bookia.example/bookstores/eterna-cadencia/logo",
    });
  });

  register("loads a public bookstore logo without session credentials", async () => {
    const pngHeader = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 13, 73, 72, 68, 82, 0, 0, 0, 32, 0, 0, 0, 32]);
    const requests = [];
    const image = {};
    Object.defineProperty(image, "src", { set() { queueMicrotask(() => image.onload()); } });

    const logo = await bookSharingState.loadInstagramStoryBookstoreLogo?.({
      logoUrl: "/api/bookstores/eterna-cadencia/logo",
      fetchLike: async (url, options) => {
        requests.push({ url, options });
        return { ok: true, headers: new Headers({ "content-type": "image/png", "content-length": String(pngHeader.byteLength) }), blob: async () => new Blob([pngHeader], { type: "image/png" }) };
      },
      imageFactory: () => image,
    });

    assert.equal(logo, image);
    assert.deepEqual(requests, [{ url: "/api/bookstores/eterna-cadencia/logo", options: { credentials: "omit" } }]);
  });

  register("falls back before decoding when a bookstore logo response is not an image", async () => {
    let decodeStarted = false;
    const logo = await bookSharingState.loadInstagramStoryBookstoreLogo?.({
      logoUrl: "/api/bookstores/eterna-cadencia/logo",
      fetchLike: async () => ({ ok: true, headers: new Headers({ "content-type": "text/html", "content-length": "128" }) }),
      imageFactory: () => { decodeStarted = true; return {}; },
    });

    assert.equal(logo, null);
    assert.equal(decodeStarted, false);
  });

  register("creates the bookstore-led Instagram Story with logo, cover and safe-area copy", async () => {
    const cover = createStoryImage(600, 900);
    const bookstoreLogo = createStoryImage(320, 320);
    const documentLike = createStoryDocument([cover, bookstoreLogo]);
    const requests = [];

    const file = await bookSharingState.createInstagramStoryFile({
      item: { id: 42, title: "Estadística práctica para ciencia de datos", author: "Peter Bruce, Andrew Bruce y Peter Gedeck", availability_status: "available", publisher: "Marcombo", language: "Español", book_status: "usado", genres: [{ name: "Informática" }] },
      bookstore: { name: "Databooksar", slug: "databooksar" },
      coverUrl: "/api/dashboard/catalog/42/cover",
      bookstoreLogoUrl: "/api/bookstores/databooksar/logo",
      fetchLike: async (url, options) => {
        requests.push({ url, options });
        return { ok: true, headers: new Headers({ "content-type": "image/png", "content-length": String(PNG_HEADER.byteLength) }), blob: async () => new Blob([PNG_HEADER], { type: "image/png" }) };
      },
      documentLike,
      FileCtor: FakeFile,
    });

    assert.equal(documentLike.canvas.width, 1080);
    assert.equal(documentLike.canvas.height, 1920);
    assert.deepEqual(requests, [
      { url: "/api/dashboard/catalog/42/cover", options: { credentials: "include" } },
      { url: "/api/bookstores/databooksar/logo", options: { credentials: "omit" } },
    ]);
    assert.ok(documentLike.drawCalls.some((args) => args[0] === cover));
    assert.ok(documentLike.drawCalls.some((args) => args[0] === bookstoreLogo));
    assert.ok(documentLike.filledArcs.some(({ args: [, y, radius], fillStyle }) => y > 500 && radius >= 200 && fillStyle === "#e85d3f"));
    const text = documentLike.textCalls.map(({ value }) => value);
    ["bookia", "LIBRO RECOMENDADO", "DISPONIBLE EN", "Databooksar", "DISPONIBLE", "AHORA", "VER EL LIBRO EN BOOKIA →"].forEach((value) => assert.ok(text.includes(value), `missing Story text: ${value}`));
    assert.ok(text.join(" ").includes("Estadística práctica para ciencia de datos"));
    assert.ok(text.join(" ").includes("Peter Bruce, Andrew Bruce y Peter Gedeck"));
    ["GÉNERO", "EDITORIAL", "IDIOMA", "ESTADO"].forEach((value) => assert.equal(text.includes(value), false));
    assert.ok(documentLike.textCalls.filter(({ value }) => String(value).trim()).every(({ y }) => y >= 220 && y <= 1640));
    assert.ok(documentLike.styledRectangles.some(({ args: [x, y, width, height], fillStyle }) => x >= 140 && y >= 1480 && x + width <= 940 && y + height <= 1640 && fillStyle === "#e85d3f"));
    assert.equal(file.type, "image/png");
    assert.match(file.name, /^bookia-story-estadistica-practica-para-ciencia-de-datos\.png$/);
  });

  register("uses readable bookstore monograms when a Story logo is unavailable", async () => {
    const oneWordDocument = createStoryDocument();
    const twoWordDocument = createStoryDocument();

    const oneWordFile = await bookSharingState.createInstagramStoryFile({ item: { title: "Libro" }, bookstore: { name: "Databooksar" }, documentLike: oneWordDocument, FileCtor: FakeFile });
    const twoWordFile = await bookSharingState.createInstagramStoryFile({ item: { title: "Libro" }, bookstore: { name: "Eterna Cadencia" }, documentLike: twoWordDocument, FileCtor: FakeFile });

    assert.ok(oneWordDocument.textCalls.some(({ value }) => value === "DA"));
    assert.ok(twoWordDocument.textCalls.some(({ value }) => value === "EC"));
    assert.equal(oneWordFile.type, "image/png");
    assert.equal(twoWordFile.type, "image/png");
  });

  register("keeps an ellipsis on the last visible line of an overflowing Story title", async () => {
    const documentLike = createStoryDocument();

    await bookSharingState.createInstagramStoryFile({
      item: { title: "Un título extraordinariamente largo que no debe invadir toda la Story ni desaparecer sin aviso", author: "Autora" },
      bookstore: { name: "Databooksar" },
      documentLike,
      FileCtor: FakeFile,
    });

    const titleLines = documentLike.textCalls.filter(({ y, font }) => y >= 1320 && y < 1468 && String(font).includes("Georgia")).map(({ value }) => value);
    assert.equal(titleLines.length, 2);
    assert.match(titleLines.at(-1), /…$/);
  });

  register("keeps every rendered line of an unbroken Story title inside its maximum width", async () => {
    const documentLike = createStoryDocument();

    await bookSharingState.createInstagramStoryFile({
      item: { title: "Supercalifragilisticoextraordinariamentelarguisimosinespaciosparacortar", author: "Autora" },
      bookstore: { name: "Databooksar" },
      documentLike,
      FileCtor: FakeFile,
    });

    const titleCalls = documentLike.textCalls.filter(({ y, font }) => y >= 1320 && y < 1468 && String(font).includes("Georgia"));
    assert.ok(titleCalls.length >= 1 && titleCalls.length <= 2);
    assert.ok(titleCalls.every(({ value, font }) => {
      const fontSize = Number(String(font).match(/(\d+)px/)?.[1]);
      return String(value).length * fontSize * 0.5 <= 800;
    }));
  });

  register("loads a public catalog cover without session credentials", async () => {
    const pngHeader = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 13, 73, 72, 68, 82, 0, 0, 0, 32, 0, 0, 0, 32]);
    const requests = [];
    const image = {};
    Object.defineProperty(image, "src", { set() { queueMicrotask(() => image.onload()); } });

    await loadInstagramStoryCover({
      coverUrl: "/api/catalog/42/cover",
      fetchLike: async (url, options) => {
        requests.push({ url, options });
        return { ok: true, headers: new Headers({ "content-type": "image/png", "content-length": String(pngHeader.byteLength) }), blob: async () => new Blob([pngHeader], { type: "image/png" }) };
      },
      imageFactory: () => image,
    });

    assert.deepEqual(requests, [{ url: "/api/catalog/42/cover", options: { credentials: "omit" } }]);
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

}
