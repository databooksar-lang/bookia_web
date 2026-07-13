import test from "node:test";
import assert from "node:assert/strict";

import { getGenreSelectorState } from "../src/genreSelectorState.js";

test("returns loading state while genres are being fetched", () => {
  assert.deepEqual(
    getGenreSelectorState({ genresLoading: true, genresError: "", genres: [] }),
    { kind: "loading", message: "Cargando generos..." },
  );
});

test("returns error state when genres request fails", () => {
  assert.deepEqual(
    getGenreSelectorState({ genresLoading: false, genresError: "No pudimos cargar los generos.", genres: [] }),
    { kind: "error", message: "No pudimos cargar los generos." },
  );
});

test("returns empty state when the API responds without genres", () => {
  assert.deepEqual(
    getGenreSelectorState({ genresLoading: false, genresError: "", genres: [] }),
    { kind: "empty", message: "No hay generos disponibles por ahora." },
  );
});

test("returns ready state when genres exist", () => {
  assert.deepEqual(
    getGenreSelectorState({ genresLoading: false, genresError: "", genres: [{ id: 1, name: "Policial" }] }),
    { kind: "ready", message: "" },
  );
});
