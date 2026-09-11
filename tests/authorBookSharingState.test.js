import assert from "node:assert/strict";

import { buildAuthorBookShareMessage, buildAuthorBookShareUrl, createAuthorBookInstagramStoryFile, getSharedAuthorBookId } from "../src/authorBookSharingState.js";

function createStoryDocument(cover, logo) {
  const drawCalls = [];
  const context = {
    drawImage(...args) { drawCalls.push(args); }, fillRect() {}, fillText() {},
    measureText(value) { return { width: String(value).length * 20 }; },
  };
  const canvas = { width: 0, height: 0, getContext: () => context, toBlob: (callback) => callback(new Blob(["story"], { type: "image/png" })) };
  const images = [cover, logo];
  return {
    drawCalls,
    createElement(kind) {
      if (kind === "canvas") return canvas;
      return images.shift();
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

export function registerAuthorBookSharingStateTests(register) {
  register("builds a public author-book link and message", () => {
    const book = { id: 7, title: "La casa del viento", genre: { name: "Novela" }, publisher: "Ediciones Sur", publication_year: 2026 };
    assert.equal(buildAuthorBookShareUrl({ origin: "https://bookia.app", readerSlug: "ana-borges", bookId: 7 }), "https://bookia.app/readers/ana-borges?book=7");
    assert.equal(buildAuthorBookShareMessage({ book, authorName: "Ana Borges" }), "Conocé \"La casa del viento\" de Ana Borges en Bookia. Género: Novela. Editorial: Ediciones Sur. Año: 2026.");
  });

  register("accepts only a positive shared author-book id", () => {
    assert.equal(getSharedAuthorBookId("?book=7"), 7);
    assert.equal(getSharedAuthorBookId("?book=0"), null);
    assert.equal(getSharedAuthorBookId("?book=7x"), null);
  });

  register("draws a decoded author-book cover that has intrinsic but no layout dimensions", async () => {
    const cover = { width: 0, height: 0, naturalWidth: 900, naturalHeight: 1200 };
    const logo = { width: 108, height: 108 };
    Object.defineProperty(cover, "src", { set() { queueMicrotask(() => cover.onload()); } });
    Object.defineProperty(logo, "src", { set() { queueMicrotask(() => logo.onload()); } });
    const documentLike = createStoryDocument(logo, cover);
    const pngHeader = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 13, 73, 72, 68, 82, 0, 0, 3, 132, 0, 0, 4, 176]);

    await createAuthorBookInstagramStoryFile({
      book: { id: 4, title: "La flor invertida", genre: { name: "Romance" }, cover_url: "/readers/fa-luz/author-books/4/cover" },
      authorName: "Favio Anselmo Lucero",
      coverUrl: "/api/readers/fa-luz/author-books/4/cover",
      fetchLike: async () => ({ ok: true, headers: new Headers({ "content-type": "image/png", "content-length": String(pngHeader.byteLength) }), blob: async () => new Blob([pngHeader], { type: "image/png" }) }),
      documentLike,
      FileCtor: FakeFile,
    });

    assert.ok(documentLike.drawCalls.some(([image]) => image === cover));
  });
}
