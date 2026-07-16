import { mergeAiAutocompleteSuggestion, getAiAutocompleteSourceState } from "../src/aiAutocompleteState.js";

export function registerAiAutocompleteStateTests(register) {
  register("fills empty description and genre from an AI suggestion", () => {
    const draft = { title: "Rayuela", description: "", genre_ids: [] };
    const suggestion = { description: "Novela experimental.", genre_id: 12 };

    const result = mergeAiAutocompleteSuggestion(draft, suggestion);

    if (result.description !== "Novela experimental.") throw new Error("description was not filled");
    if (JSON.stringify(result.genre_ids) !== JSON.stringify([12])) throw new Error("genre id was not filled");
  });

  register("preserves existing description and genre when applying an AI suggestion", () => {
    const draft = { title: "Rayuela", description: "Descripcion humana.", genre_ids: [7] };
    const suggestion = { description: "Descripcion IA.", genre_id: 12 };

    const result = mergeAiAutocompleteSuggestion(draft, suggestion);

    if (result.description !== "Descripcion humana.") throw new Error("description should be preserved");
    if (JSON.stringify(result.genre_ids) !== JSON.stringify([7])) throw new Error("genre ids should be preserved");
  });

  register("overwrites existing description and genre when applying an explicit AI replacement", () => {
    const draft = { title: "Rayuela", description: "Descripcion vieja.", genre_ids: [7] };
    const suggestion = { description: "Descripcion IA.", genre_id: 12 };

    const result = mergeAiAutocompleteSuggestion(draft, suggestion, { overwriteExisting: true });

    if (result.description !== "Descripcion IA.") throw new Error("description should be overwritten");
    if (JSON.stringify(result.genre_ids) !== JSON.stringify([12])) throw new Error("genre ids should be overwritten");
  });

  register("does not clear existing description or genre when AI replacement has empty values", () => {
    const draft = { title: "Rayuela", description: "Descripcion vieja.", genre_ids: [7] };
    const suggestion = { description: "   ", genre_id: null };

    const result = mergeAiAutocompleteSuggestion(draft, suggestion, { overwriteExisting: true });

    if (result.description !== "Descripcion vieja.") throw new Error("description should not be cleared");
    if (JSON.stringify(result.genre_ids) !== JSON.stringify([7])) throw new Error("genre ids should not be cleared");
  });

  register("exposes source links only when web search was used", () => {
    const state = getAiAutocompleteSourceState({
      used_web: true,
      sources: [{ title: "Ficha", url: "https://example.com/book" }],
    });

    if (!state.shouldShow) throw new Error("sources should be visible");
    if (state.sources[0].title !== "Ficha") throw new Error("source title was not preserved");
  });

  register("hides source links when web search was not used", () => {
    const state = getAiAutocompleteSourceState({ used_web: false, sources: [{ title: "Ficha", url: "https://example.com/book" }] });

    if (state.shouldShow) throw new Error("sources should be hidden");
    if (state.sources.length !== 0) throw new Error("sources should be empty");
  });
}