import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createServer } from "vite";

const PNG_HEADER = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 13, 73, 72, 68, 82, 0, 0, 2, 88, 0, 0, 3, 132]);

function createStoryImage(width, height) {
  const image = { width, height };
  Object.defineProperty(image, "src", { set() { queueMicrotask(() => image.onload()); } });
  return image;
}

function createStoryDocument(images = []) {
  const drawCalls = [];
  const textCalls = [];
  const rectangles = [];
  const context = {
    beginPath() {}, clip() {}, closePath() {}, fill() {}, lineTo() {}, moveTo() {}, quadraticCurveTo() {}, restore() {}, save() {}, stroke() {}, translate() {},
    drawImage(...args) { drawCalls.push(args); },
    fillRect(...args) { rectangles.push({ args, fillStyle: this.fillStyle }); },
    fillText(value, x, y) { textCalls.push({ value, x, y, fillStyle: this.fillStyle, font: this.font, textAlign: this.textAlign }); },
    measureText(value) { return { width: String(value).length * 22 }; },
  };
  const canvas = { width: 0, height: 0, getContext: () => context, toBlob: (callback) => callback(new Blob(["story"], { type: "image/png" })) };
  const imageQueue = [...images];
  return {
    canvas,
    drawCalls,
    textCalls,
    rectangles,
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

export function registerBookstoreProfileSharingStateTests(register) {
  register("builds canonical bookstore profile share URLs with the configured base path", async () => {
    const { buildBookstoreProfileShareUrl } = await import("../src/bookstoreProfileSharingState.js");

    assert.equal(buildBookstoreProfileShareUrl({ origin: "https://bookia.app", bookstoreSlug: "libros-del-pasaje" }), "https://bookia.app/bookstores/libros-del-pasaje");
    assert.equal(buildBookstoreProfileShareUrl({ origin: "https://bookia.app", basePath: "/descubrir/", bookstoreSlug: "libros-del-pasaje" }), "https://bookia.app/descubrir/bookstores/libros-del-pasaje");
  });

  register("builds a bookstore profile share message with its identity", async () => {
    const { buildBookstoreProfileShareMessage } = await import("../src/bookstoreProfileSharingState.js");

    assert.equal(buildBookstoreProfileShareMessage({ bookstoreName: "Eterna Cadencia" }), "Descubrí el perfil de Eterna Cadencia en Bookia.");
  });

  register("resolves only profile Story assets owned by the shared bookstore", async () => {
    const { buildBookstoreProfileStoryAssetUrls } = await import("../src/bookstoreProfileSharingState.js");

    assert.deepEqual(buildBookstoreProfileStoryAssetUrls({
      bookstore: { slug: "eterna-cadencia", hero_image_url: "/bookstores/eterna-cadencia/banner", logo_url: "/api/bookstores/eterna-cadencia/logo" },
      resolveUrl: (path) => `https://api.bookia.example${path}`,
    }), {
      bannerUrl: "https://api.bookia.example/bookstores/eterna-cadencia/banner",
      logoUrl: "https://api.bookia.example/bookstores/eterna-cadencia/logo",
    });
    assert.deepEqual(buildBookstoreProfileStoryAssetUrls({
      bookstore: { slug: "eterna-cadencia", hero_image_url: "/bookstores/otra/banner", logo_url: "https://untrusted.example/bookstores/eterna-cadencia/logo" },
      trustedOrigins: ["https://api.bookia.example"],
    }), { bannerUrl: null, logoUrl: null });
  });

  register("creates a 1080 by 1920 bookstore profile Story with banner logo and safe-area copy", async () => {
    const { createBookstoreProfileInstagramStoryFile } = await import("../src/bookstoreProfileSharingState.js");
    const banner = createStoryImage(1600, 600);
    const logo = createStoryImage(320, 320);
    const documentLike = createStoryDocument([banner, logo]);
    const requests = [];

    const file = await createBookstoreProfileInstagramStoryFile({
      bookstore: { name: "Eterna Cadencia", slug: "eterna-cadencia" },
      bannerUrl: "/api/bookstores/eterna-cadencia/banner",
      logoUrl: "/api/bookstores/eterna-cadencia/logo",
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
      { url: "/api/bookstores/eterna-cadencia/banner", options: { credentials: "omit" } },
      { url: "/api/bookstores/eterna-cadencia/logo", options: { credentials: "omit" } },
    ]);
    assert.ok(documentLike.drawCalls.some((args) => args[0] === banner));
    assert.ok(documentLike.drawCalls.some((args) => args[0] === logo));
    const text = documentLike.textCalls.map(({ value }) => value);
    ["bookia", "PERFIL DE LIBRERÍA", "Eterna Cadencia", "DESCUBRÍ SU CATÁLOGO", "VISITÁ EL PERFIL EN BOOKIA", "AGREGÁ EL STICKER ENLACE"].forEach((value) => assert.ok(text.includes(value), `missing Story text: ${value}`));
    assert.ok(documentLike.textCalls.filter(({ value }) => String(value).trim()).every(({ y }) => y >= 220 && y <= 1640));
    assert.equal(file.type, "image/png");
    assert.equal(file.name, "bookia-perfil-eterna-cadencia.png");
  });

  register("keeps profile Stories usable when either banner or logo fails", async () => {
    const { createBookstoreProfileInstagramStoryFile } = await import("../src/bookstoreProfileSharingState.js");
    const logo = createStoryImage(320, 320);
    const bannerFailureDocument = createStoryDocument([logo]);
    const bannerFailureFile = await createBookstoreProfileInstagramStoryFile({
      bookstore: { name: "Eterna Cadencia", slug: "eterna-cadencia" },
      bannerUrl: "/api/bookstores/eterna-cadencia/banner",
      logoUrl: "/api/bookstores/eterna-cadencia/logo",
      fetchLike: async (url) => url.endsWith("/banner")
        ? { ok: false, headers: new Headers() }
        : { ok: true, headers: new Headers({ "content-type": "image/png", "content-length": String(PNG_HEADER.byteLength) }), blob: async () => new Blob([PNG_HEADER], { type: "image/png" }) },
      documentLike: bannerFailureDocument,
      FileCtor: FakeFile,
    });

    const banner = createStoryImage(1600, 600);
    const logoFailureDocument = createStoryDocument([banner]);
    const logoFailureFile = await createBookstoreProfileInstagramStoryFile({
      bookstore: { name: "Eterna Cadencia", slug: "eterna-cadencia" },
      bannerUrl: "/api/bookstores/eterna-cadencia/banner",
      logoUrl: "/api/bookstores/eterna-cadencia/logo",
      fetchLike: async (url) => url.endsWith("/logo")
        ? { ok: false, headers: new Headers() }
        : { ok: true, headers: new Headers({ "content-type": "image/png", "content-length": String(PNG_HEADER.byteLength) }), blob: async () => new Blob([PNG_HEADER], { type: "image/png" }) },
      documentLike: logoFailureDocument,
      FileCtor: FakeFile,
    });

    assert.ok(bannerFailureDocument.drawCalls.some((args) => args[0] === logo));
    assert.ok(logoFailureDocument.drawCalls.some((args) => args[0] === banner));
    assert.equal(bannerFailureFile.type, "image/png");
    assert.equal(logoFailureFile.type, "image/png");
  });

  register("keeps an unbroken bookstore name inside the Story safe width", async () => {
    const { createBookstoreProfileInstagramStoryFile } = await import("../src/bookstoreProfileSharingState.js");
    const documentLike = createStoryDocument();

    await createBookstoreProfileInstagramStoryFile({
      bookstore: { name: "LibreriaInternacionalEspecializadaEnCienciaFiccionFantastica", slug: "libreria-internacional" },
      documentLike,
      FileCtor: FakeFile,
    });

    const nameLines = documentLike.textCalls.filter(({ y, font }) => y >= 1030 && y < 1210 && String(font).includes("Georgia"));
    assert.ok(nameLines.length > 1);
    assert.ok(nameLines.every(({ value }) => String(value).length * 22 <= 800));
  });

  register("copies the profile URL before sharing its Instagram Story", async () => {
    const { shareBookstoreProfileInstagramStory } = await import("../src/bookstoreProfileSharingState.js");
    const events = [];

    const result = await shareBookstoreProfileInstagramStory({
      url: "https://bookia.app/bookstores/eterna-cadencia",
      title: "Eterna Cadencia",
      copyUrl: async (url) => { events.push(["copy", url]); },
      createFile: async () => { events.push(["create"]); return { name: "profile.png" }; },
      shareFile: async ({ file, title }) => { events.push(["share", file.name, title]); return "shared"; },
    });

    assert.deepEqual(events, [
      ["copy", "https://bookia.app/bookstores/eterna-cadencia"],
      ["create"],
      ["share", "profile.png", "Eterna Cadencia"],
    ]);
    assert.deepEqual(result, { result: "shared", linkCopied: true });
  });

  register("renders the exact bookstore profile share trigger", async () => {
    const previousWindow = globalThis.window;
    globalThis.window = { location: { origin: "https://bookia.app" } };
    const vite = await createServer({ server: { middlewareMode: true }, appType: "custom" });
    try {
      const { BookstoreProfileShareMenu } = await vite.ssrLoadModule("/src/components/BookstoreProfileShareMenu.jsx");
      const markup = renderToStaticMarkup(createElement(BookstoreProfileShareMenu, { bookstore: { id: 1, slug: "eterna-cadencia", name: "Eterna Cadencia" } }));
      assert.match(markup, /Compartir Perfil<\/button>/);
      assert.match(markup, /aria-label="Compartir el perfil de Eterna Cadencia"/);
    } finally {
      await vite.close();
      globalThis.window = previousWindow;
    }
  });

  register("keeps the profile share options in normal flow and on one row", () => {
    const editorialStyles = readFileSync(new URL("../src/editorial.css", import.meta.url), "utf8");

    assert.match(editorialStyles, /\.bookstore-profile-share-menu \.book-share-options\s*\{[^}]*position:\s*static;[^}]*width:\s*max-content;[^}]*max-width:\s*calc\(100vw\s*-\s*32px\);[^}]*flex-wrap:\s*nowrap;/s);
  });
}
