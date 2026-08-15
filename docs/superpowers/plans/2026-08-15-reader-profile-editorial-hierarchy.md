# Reader Profile Editorial Hierarchy Implementation Plan

**Goal:** Clarify visual separation among all reader-profile sections without changing behavior.

**Implementation:** Add reader-profile presentation classes in `ReaderProfilePage.jsx`; define shared editorial-block styles and mobile overrides in `editorial.css`; protect the mounted structures with focused frontend tests.

**Verification:** Run `npm test`, `npm run build`, and review desktop and mobile renderings of `info`, `favorites`, and `wanted` profile tabs.
