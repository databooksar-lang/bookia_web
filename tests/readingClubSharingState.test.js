import assert from "node:assert/strict";

import { buildReadingClubInstagramStoryCoverPath, buildReadingClubInstagramStoryMetadata, buildReadingClubShareMessage, buildReadingClubShareUrl, createReadingClubInstagramStoryFile, getSharedReadingClubId, resolveReadingClubInstagramStoryCoverUrl } from "../src/readingClubSharingState.js";

const PNG_HEADER = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 13, 73, 72, 68, 82, 0, 0, 2, 88, 0, 0, 3, 132]);

function createStoryDocument({ image = null } = {}) {
  const drawCalls = [];
  const text = [];
  const context = {
    beginPath() {}, fillRect() {}, fillText(value) { text.push(value); }, lineTo() {}, moveTo() {}, restore() {}, save() {}, stroke() {}, strokeRect() {},
    drawImage(...args) { drawCalls.push(args); },
    measureText(value) { return { width: String(value).length * 20 }; },
  };
  const canvas = { getContext: () => context, toBlob: (callback) => callback(new Blob(["story"], { type: "image/png" })) };
  return {
    drawCalls,
    text,
    createElement(kind) {
      if (kind === "canvas") return canvas;
      return image || {};
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

export function registerReadingClubSharingStateTests(register) {
  register("builds canonical share URLs for bookstore and reader clubs", () => {
    assert.equal(buildReadingClubShareUrl({ origin: "https://bookia.app", host: { type: "bookstore", slug: "pasaje" }, clubId: 7 }), "https://bookia.app/bookstores/pasaje?club=7");
    assert.equal(buildReadingClubShareUrl({ origin: "https://bookia.app", host: { type: "reader", slug: "ana" }, clubId: 8 }), "https://bookia.app/readers/ana?club=8");
  });

  register("builds a complete club message and accepts only positive shared ids", () => {
    assert.equal(buildReadingClubShareMessage({ club: { title: "Novelas del sur", genre: { name: "Novela" }, meeting_date: "2026-09-10", location: "CABA" }, hostName: "Libros del Pasaje" }), "Sumate a \"Novelas del sur\" de Libros del Pasaje en Bookia. Género: Novela. Fecha: 10/09/2026. Lugar: CABA.");
    assert.equal(getSharedReadingClubId("?club=12"), 12);
    assert.equal(getSharedReadingClubId("?club=0"), null);
  });

  register("builds compact complete metadata for a reading-club Instagram Story", () => {
    assert.deepEqual(
      buildReadingClubInstagramStoryMetadata({
        club: {
          title: "Book Talk: To reach Japan, Alice Munro",
          description: "Un encuentro guiado de conversación en inglés para compartir una historia breve de Alice Munro y preparar la lectura antes de reunirnos.",
          genre: { name: "Narrativa contemporánea" },
          meeting_date: "2026-08-29",
          location: "Online",
        },
        hostName: "Belén",
      }),
      {
        title: "Book Talk: To reach Japan, Alice Munro",
        description: "Un encuentro guiado de conversación en inglés para compartir una historia breve de Alice Munro y preparar la lectura antes de reunirnos.",
        genre: "Narrativa contemporánea",
        date: "29/08/2026",
        location: "Online",
        hostName: "Belén",
        callToAction: "MÁS DETALLES EN BOOKIA",
      },
    );
  });

  register("keeps only trusted cover routes that belong to the reading club Story", () => {
    assert.equal(buildReadingClubInstagramStoryCoverPath({ id: 7, cover_url: "/reading-clubs/7/cover" }), "/reading-clubs/7/cover");
    assert.equal(buildReadingClubInstagramStoryCoverPath({ id: 7, cover_url: "/dashboard/reading-clubs/7/cover" }), "/dashboard/reading-clubs/7/cover");
    assert.equal(buildReadingClubInstagramStoryCoverPath({ id: 7, cover_url: "https://api.bookia.example/reading-clubs/7/cover" }, { trustedOrigins: ["https://api.bookia.example"] }), "https://api.bookia.example/reading-clubs/7/cover");
    assert.equal(buildReadingClubInstagramStoryCoverPath({ id: 7, cover_url: "/reading-clubs/8/cover" }), null);
    assert.equal(buildReadingClubInstagramStoryCoverPath({ id: 7, cover_url: "https://untrusted.example/reading-clubs/7/cover" }, { trustedOrigins: ["https://api.bookia.example"] }), null);
  });

  register("resolves only a validated reading-club Story cover URL", () => {
    assert.equal(
      resolveReadingClubInstagramStoryCoverUrl(
        { id: 7, cover_url: "/dashboard/reading-clubs/7/cover" },
        { resolveUrl: (path) => `/api${path}` },
      ),
      "/api/dashboard/reading-clubs/7/cover",
    );
    assert.equal(
      resolveReadingClubInstagramStoryCoverUrl(
        { id: 7, cover_url: "/reading-clubs/8/cover" },
        { resolveUrl: (path) => `/api${path}` },
      ),
      null,
    );
  });

  register("creates a reading-club Story with its cover and every public metadata field", async () => {
    const cover = { width: 600, height: 900 };
    Object.defineProperty(cover, "src", { set() { queueMicrotask(() => cover.onload()); } });
    const documentLike = createStoryDocument({ image: cover });
    const requests = [];

    const file = await createReadingClubInstagramStoryFile({
      club: { id: 7, title: "Book Talk: To reach Japan, Alice Munro", description: "Una conversación guiada para leer, compartir ideas y preparar el encuentro.", genre: { name: "Narrativa" }, meeting_date: "2026-08-29", location: "Online" },
      hostName: "Belén",
      coverUrl: "/api/reading-clubs/7/cover",
      fetchLike: async (url, options) => {
        requests.push({ url, options });
        return { ok: true, headers: new Headers({ "content-type": "image/png", "content-length": String(PNG_HEADER.byteLength) }), blob: async () => new Blob([PNG_HEADER], { type: "image/png" }) };
      },
      documentLike,
      FileCtor: FakeFile,
    });

    assert.deepEqual(requests, [{ url: "/api/reading-clubs/7/cover", options: { credentials: "include" } }]);
    assert.ok(documentLike.drawCalls.some((args) => args[0] === cover && args.length === 9));
    assert.deepEqual(file.type, "image/png");
    assert.match(file.name, /^bookia-club-book-talk-to-reach-japan-alice-munro\.png$/);
    ["NARRATIVA", "29/08/2026", "ONLINE", "BELÉN", "MÁS DETALLES EN BOOKIA"].forEach((value) => assert.ok(documentLike.text.includes(value)));
  });

  register("creates the editorial fallback when a reading-club Story has no usable cover", async () => {
    const documentLike = createStoryDocument();
    let requested = false;

    const file = await createReadingClubInstagramStoryFile({
      club: { id: 7, title: "Club de prueba", description: "Una descripción extensa que sigue disponible aunque la portada no cargue." },
      hostName: "Bookia",
      coverUrl: "/api/reading-clubs/7/cover",
      fetchLike: async () => { requested = true; return { ok: false, headers: new Headers() }; },
      documentLike,
      FileCtor: FakeFile,
    });

    assert.equal(requested, true);
    assert.equal(documentLike.drawCalls.length, 0);
    assert.ok(documentLike.text.includes("CLUB DE LECTURA"));
    assert.equal(file.type, "image/png");
  });

  register("keeps a long reading-club Story genre inside its badge", async () => {
    const documentLike = createStoryDocument();

    await createReadingClubInstagramStoryFile({
      club: {
        id: 7,
        title: "Club de prueba",
        description: "Una invitación para compartir lecturas.",
        genre: { name: "Literatura infantil y juvenil contemporánea" },
        meeting_date: "2026-08-29",
        location: "Online",
      },
      hostName: "Belén",
      documentLike,
      FileCtor: FakeFile,
    });

    assert.ok(documentLike.text.includes("LITERATURA IN…"));
    assert.ok(!documentLike.text.includes("LITERATURA INFANTIL Y JUVENIL CONTEMPORÁNEA"));
  });

  register("creates a reading-club Story without requesting a cover when none is available", async () => {
    const documentLike = createStoryDocument();
    const file = await createReadingClubInstagramStoryFile({
      club: { id: 7, title: "Club sin portada" },
      hostName: "Bookia",
      fetchLike: async () => { throw new Error("No se debe solicitar una portada ausente"); },
      documentLike,
      FileCtor: FakeFile,
    });

    assert.ok(documentLike.text.includes("CLUB DE LECTURA"));
    assert.equal(file.type, "image/png");
  });
}
