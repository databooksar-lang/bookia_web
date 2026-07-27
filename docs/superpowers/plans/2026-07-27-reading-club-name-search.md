# Reading Club Name Search Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let visitors filter public reading clubs by title while preserving the existing genre filter.

**Architecture:** Keep the API request keyed only by genre. Add the text query to `ReadingClubsSection` and pass it to the pure `getVisibleReadingClubs` helper, which performs case- and accent-insensitive matching on club titles before applying the existing six-item limit.

**Tech Stack:** React 18, Vite, Node assert test runner.

## Global Constraints

- Search only club titles; do not search descriptions, locations, or hosts.
- Apply the text and genre filters together.
- Do not change the API or backend.
- Preserve the six-item limit only when both filters are empty.

---

### Task 1: Title filter state and UI

**Files:**
- Modify: `tests/publicSearchState.test.js`
- Modify: `src/publicSearchState.js`
- Modify: `src/pages/PublicPages.jsx`
- Modify: `src/editorial.css`

**Interfaces:**
- Consumes: `getVisibleReadingClubs(clubs, genreSlug)`.
- Produces: `getVisibleReadingClubs(clubs, genreSlug, query)` returning the clubs matching the loaded genre and title query.

- [ ] **Step 1: Write the failing test**

```js
register("filters reading clubs by title without case or accent sensitivity", () => {
  const clubs = [
    { id: 1, title: "Círculo de poesía" },
    { id: 2, title: "Misterio nocturno" },
  ];

  assert.deepEqual(
    publicSearchState.getVisibleReadingClubs(clubs, "policial", "circulo").map((club) => club.id),
    [1],
  );
});

register("keeps all matching clubs when filtering by title", () => {
  const clubs = Array.from({ length: 7 }, (_, index) => ({ id: index + 1, title: "Club mensual" }));

  assert.deepEqual(
    publicSearchState.getVisibleReadingClubs(clubs, "", "club").map((club) => club.id),
    [1, 2, 3, 4, 5, 6, 7],
  );
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test`

Expected: FAIL because `getVisibleReadingClubs` ignores its third argument and limits the title-filtered list to six results.

- [ ] **Step 3: Write the minimal implementation**

```js
export function getVisibleReadingClubs(clubs = [], genreSlug = "", query = "") {
  const normalizedQuery = normalizeBookstoreSearchValue(query);
  const matchingClubs = normalizedQuery
    ? clubs.filter((club) => normalizeBookstoreSearchValue(club?.title).includes(normalizedQuery))
    : clubs;

  return genreSlug || normalizedQuery ? matchingClubs : matchingClubs.slice(0, 6);
}
```

Add `const [query, setQuery] = useState("");` to `ReadingClubsSection`, pass `query` to `getVisibleReadingClubs`, and render an input with the exact label `Buscar por nombre o palabras clave`. Retain the existing genre select. Change the filters grid to two responsive columns and stack it at the existing mobile breakpoint. When the result is empty and `query` is non-empty, show a title and guidance that refer to the text search rather than an upcoming-clubs state.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test`

Expected: PASS, including the new title-search and result-limit tests.

- [ ] **Step 5: Build the production bundle**

Run: `npm run build`

Expected: PASS with a generated `dist` bundle and no build errors.

- [ ] **Step 6: Commit**

```bash
git add src/publicSearchState.js src/pages/PublicPages.jsx src/editorial.css tests/publicSearchState.test.js
git commit -m "agrega busqueda por nombre de clubes"
```
