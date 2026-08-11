# Horizontal Share Menu Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Present the sharing controls for books and reading clubs as a consistent, modern horizontal action bar with one labeled Instagram Story action.

**Architecture:** Keep the existing `BookShareMenu` and `ReadingClubShareMenu` ownership and sharing-state APIs. Remove the redundant generic Instagram action from both menus, standardize their action markup and use shared CSS classes in `editorial.css` for visual behavior and responsive wrapping.

**Tech Stack:** React 18, CSS, Vite, Node built-in test runner.

## Global Constraints

- Preserve all existing sharing URLs, Story file generation, user feedback, error states and analytics event names.
- Present WhatsApp, Instagram Story, Telegram and copy-link actions horizontally in both menus.
- Keep the action bar inside the mobile viewport and retain accessible labels and keyboard focus states.
- Do not alter legal pages or README: this visual-only change does not affect policy, data processing, integrations or deployment.

---

### Task 1: Unify share-menu actions and responsive styling

**Files:**
- Modify: `src/components/BookShareMenu.jsx:36-93`
- Modify: `src/components/ReadingClubShareMenu.jsx:9-18`
- Modify: `src/editorial.css:4115-4125`
- Modify: `tests/run-tests.js:517-519`

**Interfaces:**
- Consumes: `createInstagramStoryFile`, `createReadingClubInstagramStoryFile`, `shareInstagramStoryFile`, `buildWhatsAppShareHref`, `buildTelegramShareHref`, and the existing analytics callbacks.
- Produces: the unchanged `BookShareMenu` and `ReadingClubShareMenu` React component exports, each rendering a `.book-share-options` group whose actions include `book-share-icon-button`, `book-share-story-button`, and `book-share-copy-button`.

- [ ] **Step 1: Write the failing structural assertions**

  In `tests/run-tests.js`, replace the current vertical-menu-oriented checks with assertions that require a horizontal flex layout, wrapping on narrow viewports, a compact Story action, and no minimum menu width that could force overflow:

  ```js
  assert.match(editorialStyles, /\.book-share-options\s*\{[^}]*display:\s*flex;[^}]*align-items:\s*center;[^}]*flex-wrap:\s*wrap;/);
  assert.match(editorialStyles, /\.book-share-options \.book-share-story-button\s*\{[^}]*display:\s*inline-flex;[^}]*white-space:\s*nowrap;/);
  assert.match(editorialStyles, /@media \(max-width: 620px\)[\s\S]*?\.book-share-options\s*\{[^}]*max-width:\s*calc\(100vw\s*-\s*32px\);/);
  ```

- [ ] **Step 2: Run the suite to verify the assertions fail**

  Run: `npm test`

  Expected: FAIL because `.book-share-options` is currently a grid and does not yet have the required horizontal flex declarations.

- [ ] **Step 3: Implement the normalized action markup**

  In both share-menu components:

  ```jsx
  <button type="button" className="book-share-story-button" onClick={storyHandler} disabled={isStoryBusy} aria-label="Compartir Historia de Instagram">
    <InstagramIcon size={18} />
    <span>{isStoryBusy ? "Creando..." : "Story"}</span>
  </button>
  <button type="button" className="book-share-copy-button" onClick={copyHandler} aria-label="Copiar enlace" title="Copiar enlace">
    Copiar enlace
  </button>
  ```

  Remove the generic `shareInstagram` / `instagram` handler and its icon-only button. Preserve the Story handler, all other action handlers, their analytics, and existing feedback text.

- [ ] **Step 4: Implement horizontal CSS and mobile containment**

  Update `.book-share-options` to use `display: flex`, `align-items: center`, and `flex-wrap: wrap`; size icon actions as rounded, equal square controls; make `.book-share-story-button` an inline-flex labeled control; and style `.book-share-copy-button` as a compact text action. Retain the cream surface, existing border, shadow, hover and focus treatment. Under `620px`, bound its width with `max-width: calc(100vw - 32px)` and allow actions to wrap.

- [ ] **Step 5: Run the suite to verify the change passes**

  Run: `npm test`

  Expected: PASS with the updated style assertions and all sharing-state tests passing.

- [ ] **Step 6: Build the production bundle**

  Run: `npm run build`

  Expected: Vite completes without compilation errors.

- [ ] **Step 7: Commit the implementation**

  ```bash
  git add src/components/BookShareMenu.jsx src/components/ReadingClubShareMenu.jsx src/editorial.css tests/run-tests.js
  git commit -m "feat: modernize share action menus"
  ```
