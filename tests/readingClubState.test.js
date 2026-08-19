import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import {
  createReadingClubDraft,
  buildReadingClubPayload,
  displayReadingClubDate,
} from "../src/readingClubState.js";
import * as readingClubState from "../src/readingClubState.js";

export function registerReadingClubStateTests(test) {
  test("creates a reading club draft with editable defaults", () => {
    assert.deepEqual(createReadingClubDraft(), {
      id: null,
      title: "",
      description: "",
      genre_id: "",
      meeting_date: "",
      location: "",
      external_url: "",
      is_visible: true,
    });
  });

  test("starts a private reader's new club as a hidden draft", () => {
    assert.equal(typeof readingClubState.createNewReadingClubDraft, "function");
    assert.equal(readingClubState.createNewReadingClubDraft({ canPublish: false }).is_visible, false);
    assert.equal(readingClubState.createNewReadingClubDraft({ canPublish: true }).is_visible, true);
  });

  test("creates a reading club draft from an existing club", () => {
    assert.deepEqual(
      createReadingClubDraft({
        id: 4,
        title: "  Misterio abierto  ",
        description: "Lecturas compartidas",
        genre_id: 7,
        meeting_date: "2026-08-20",
        location: "Sala del fondo",
        external_url: "https://libreria.example.com/clubes/misterio",
        is_visible: false,
      }),
      {
        id: 4,
        title: "  Misterio abierto  ",
        description: "Lecturas compartidas",
        genre_id: "7",
        meeting_date: "2026-08-20",
        location: "Sala del fondo",
        external_url: "https://libreria.example.com/clubes/misterio",
        is_visible: false,
      },
    );
  });

  test("builds the reading club API payload", () => {
    assert.deepEqual(
      buildReadingClubPayload({
        title: "  Misterio abierto  ",
        description: "  Club mensual  ",
        genre_id: "7",
        meeting_date: "",
        location: "  ",
        external_url: "  https://example.com/club  ",
        is_visible: false,
      }),
      {
        title: "Misterio abierto",
        description: "Club mensual",
        genre_id: 7,
        meeting_date: null,
        location: null,
        external_url: "https://example.com/club",
        is_visible: false,
      },
    );
  });

  test("formats reading club dates for display", () => {
    assert.equal(displayReadingClubDate("2026-08-20"), "20/08/2026");
    assert.equal(displayReadingClubDate(null), "Fecha a confirmar");
    assert.equal(displayReadingClubDate(""), "Fecha a confirmar");
  });

  test("integrates reading clubs in dashboard and public storefront", () => {
    const dashboardSource = readFileSync(new URL("../src/pages/DashboardPage.jsx", import.meta.url), "utf8");
    const managerSource = readFileSync(new URL("../src/components/ReadingClubManager.jsx", import.meta.url), "utf8");
    const readerProfileSource = readFileSync(new URL("../src/pages/ReaderProfilePage.jsx", import.meta.url), "utf8");
    const publicPagesSource = readFileSync(new URL("../src/pages/PublicPages.jsx", import.meta.url), "utf8");
    const routesSource = readFileSync(new URL("../src/apiRoutes.js", import.meta.url), "utf8");

    assert.match(dashboardSource, /Club de lectura/);
    assert.match(dashboardSource, /ReadingClubManager/);
    assert.match(managerSource, /\/dashboard\/reading-clubs/);
    assert.match(managerSource, /createReadingClubDraft/);
    assert.match(managerSource, /external_url/);
    assert.match(readerProfileSource, /ReadingClubManager/);
    assert.match(readerProfileSource, /type: "reader"/);
    assert.match(publicPagesSource, /reading_clubs/);
    assert.match(publicPagesSource, /Club de lectura/);
    assert.match(publicPagesSource, /reading-club-external-link/);
    assert.match(publicPagesSource, /noopener noreferrer/);
    assert.match(routesSource, /dashboard/);
  });
}
