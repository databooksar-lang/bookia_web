import assert from "node:assert/strict";

import { HOME_SECTION_INDEX_ITEMS } from "../src/sectionIndexState.js";

export function registerSectionIndexTests(register) {
  register("defines the four public home section anchors with accessible labels", () => {
    assert.deepEqual(
      HOME_SECTION_INDEX_ITEMS.map((item) => [item.id, item.label]),
      [["buscar", "Buscar"], ["librerias", "Librerías"], ["clubes", "Clubes"], ["novedades", "Novedades"]],
    );

  });
}
