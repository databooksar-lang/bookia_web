import assert from "node:assert/strict";

import { isBookiaApiRoute } from "../src/apiRoutes.js";
import { getGenreSelectorState } from "../src/genreSelectorState.js";

const tests = [
  ["treats /genres as an API route", () => {
    assert.equal(isBookiaApiRoute("/genres"), true);
    assert.equal(isBookiaApiRoute("/genres?active=true"), true);
  }],
  ["keeps non-api frontend routes out of API detection", () => {
    assert.equal(isBookiaApiRoute("/dashboard"), true);
    assert.equal(isBookiaApiRoute("/plans"), false);
  }],
  ["returns loading state while genres are being fetched", () => {
    assert.deepEqual(
      getGenreSelectorState({ genresLoading: true, genresError: "", genres: [] }),
      { kind: "loading", message: "Cargando generos..." },
    );
  }],
  ["returns error state when genres request fails", () => {
    assert.deepEqual(
      getGenreSelectorState({ genresLoading: false, genresError: "No pudimos cargar los generos.", genres: [] }),
      { kind: "error", message: "No pudimos cargar los generos." },
    );
  }],
  ["returns empty state when the API responds without genres", () => {
    assert.deepEqual(
      getGenreSelectorState({ genresLoading: false, genresError: "", genres: [] }),
      { kind: "empty", message: "Todavia no hay generos cargados en la base. Cuando existan, vas a poder seleccionarlos aca." },
    );
  }],
  ["returns ready state when genres exist", () => {
    assert.deepEqual(
      getGenreSelectorState({ genresLoading: false, genresError: "", genres: [{ id: 1, name: "Policial" }] }),
      { kind: "ready", message: "" },
    );
  }],
];

let failures = 0;
for (const [name, fn] of tests) {
  try {
    fn();
    console.log(`PASS ${name}`);
  } catch (error) {
    failures += 1;
    console.error(`FAIL ${name}`);
    console.error(error);
  }
}

if (failures > 0) {
  console.error(`\n${failures} test(s) failed.`);
  process.exit(1);
}

console.log(`\n${tests.length} test(s) passed.`);
