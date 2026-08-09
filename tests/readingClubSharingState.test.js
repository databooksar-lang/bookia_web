import assert from "node:assert/strict";

import { buildReadingClubShareMessage, buildReadingClubShareUrl, getSharedReadingClubId } from "../src/readingClubSharingState.js";

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
}
