import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import {
  createReadingClubDraft,
  buildReadingClubPayload,
  displayReadingClubDate,
} from "../src/readingClubState.js";

export function registerReadingClubStateTests(test) {
  test("creates a reading club draft with editable defaults", () => {
    assert.deepEqual(createReadingClubDraft(), {
      id: null,
      title: "",
      description: "",
      genre_id: "",
      meeting_date: "",
      location: "",
      is_visible: true,
    });
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
        is_visible: false,
      }),
      {
        id: 4,
        title: "  Misterio abierto  ",
        description: "Lecturas compartidas",
        genre_id: "7",
        meeting_date: "2026-08-20",
        location: "Sala del fondo",
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
        is_visible: false,
      }),
      {
        title: "Misterio abierto",
        description: "Club mensual",
        genre_id: 7,
        meeting_date: null,
        location: null,
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
    const publicPagesSource = readFileSync(new URL("../src/pages/PublicPages.jsx", import.meta.url), "utf8");
    const routesSource = readFileSync(new URL("../src/apiRoutes.js", import.meta.url), "utf8");

    assert.match(dashboardSource, /Club de lectura/);
    assert.match(dashboardSource, /\/dashboard\/reading-clubs/);
    assert.match(dashboardSource, /createReadingClubDraft/);
    assert.match(publicPagesSource, /reading_clubs/);
    assert.match(publicPagesSource, /Club de lectura/);
    assert.match(routesSource, /dashboard/);
  });
}
