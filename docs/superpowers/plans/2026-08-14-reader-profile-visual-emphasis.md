# Reader Profile Visual Emphasis Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add semantic emojis to reader profile sections and make “Ver perfil público” the primary visual action.

**Architecture:** Keep the existing `ReaderProfilePage` structure and route behavior. Store emoji labels in the existing tab/section copy, add a reader-profile-specific CTA class, and preserve all existing button variants elsewhere.

**Tech Stack:** React 18, Vite, plain CSS, Node test runner.

## Global Constraints

- No navigation, data, or API behavior changes.
- The CTA renders only when the profile is public and has an alias.
- Preserve existing responsive breakpoints and visible keyboard focus.
- Emojis remain text content and do not depend on image assets.

---

### Task 1: Update reader profile labels

**Files:**
- Modify: `src/pages/ReaderProfilePage.jsx` (`READER_PROFILE_TABS`, section labels, public-profile link)
- Test: `tests/readerProfileNavigationState.test.js`

**Interfaces:**
- Consumes: existing section keys and `buildReaderProfileUrl` behavior.
- Produces: unchanged section keys/URLs with updated visible labels and a dedicated CTA class.

- [ ] **Step 1: Update the tab labels and relevant section labels**

Use these exact labels:

```jsx
const READER_PROFILE_TABS = [
  { section: "info", label: "📝 Mi info" },
  { section: "favorites", label: "❤️ Mis favoritos" },
  { section: "wanted", label: "🔎 Libros buscados" },
];
```

Use `❤️ LIBROS FAVORITOS`, `🏬 LIBRERÍAS SEGUIDAS`, and `🔎 MI LISTA DE DESEOS` for the related section labels. Add `reader-public-profile-button` to the existing public-profile link class list.

- [ ] **Step 2: Extend source-level tests without changing route expectations**

Keep the existing assertions for section names and add assertions that the source contains the three emoji labels and `reader-public-profile-button`.

- [ ] **Step 3: Run the focused test**

Run: `npm test`

Expected: PASS, including the existing reader profile navigation assertions.

### Task 2: Style the public-profile CTA

**Files:**
- Modify: `src/editorial.css` near the dashboard/profile button rules

**Interfaces:**
- Consumes: `.secondary-button` base styles and `.reader-public-profile-button` class.
- Produces: a visually primary link variant scoped to reader profiles.

- [ ] **Step 1: Add scoped CTA styles**

Add a rule that uses the existing dark-green Bookia palette, light text, stronger padding/weight, and hover/focus states. Do not mutate `.secondary-button` globally.

```css
.reader-public-profile-button {
  background: var(--ink);
  border-color: var(--ink);
  color: var(--paper);
  font-weight: 800;
  box-shadow: 0 8px 20px rgba(18, 73, 60, 0.16);
}

.reader-public-profile-button:hover {
  background: var(--forest);
  border-color: var(--forest);
  color: var(--paper);
  transform: translateY(-1px);
}

.reader-public-profile-button:focus-visible {
  outline: 3px solid rgba(18, 73, 60, 0.28);
  outline-offset: 3px;
}
```

Use the repository’s existing variable names if the nearby palette uses an equivalent dark-green token.

- [ ] **Step 2: Run the build**

Run: `npm run build`

Expected: Vite completes successfully without CSS or JSX errors.

### Task 3: Verify the rendered interface

**Files:**
- No additional source files.

- [ ] **Step 1: Run the full frontend test suite**

Run: `npm test`

Expected: PASS.

- [ ] **Step 2: Inspect the diff and working tree**

Run: `git diff --check` and `git status --short`.

Expected: no whitespace errors; only the intended profile page, stylesheet, and plan files are changed after the documentation commit.

- [ ] **Step 3: Check responsive behavior**

Run the Vite app with `npm run dev -- --host 127.0.0.1`, open the reader profile route, and verify desktop and narrow viewport rendering. Confirm the emojis stay aligned, the CTA remains readable, and focus is visible when tabbing to it.
