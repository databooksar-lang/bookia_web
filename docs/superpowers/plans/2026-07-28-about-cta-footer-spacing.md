# About CTA Footer Spacing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a small visual gap between the About-page CTA and the footer.

**Architecture:** The About page already renders the CTA immediately before the shared footer. The existing `.about-cta` selector controls the panel's bottom spacing, so a single CSS declaration creates the requested gap while retaining the page's beige background.

**Tech Stack:** React, Vite, CSS.

## Global Constraints

- Work on the `develop` branch.
- Do not alter the footer, content, routes, legal pages, or README.
- Use a `24px` gap at all viewports.
- This presentation-only CSS declaration has no discrete unit-test seam; verify via production build and rendered-page inspection.

---

### Task 1: Separate the About CTA from the footer

**Files:**
- Modify: `src/editorial.css:3673`
- Test: production build and the About-page rendered layout

**Interfaces:**
- Consumes: `.about-cta`, the CTA class emitted by `AboutPage` in `src/pages/PublicPages.jsx`.
- Produces: a 24px beige gap below the CTA panel before `.site-footer` begins.

- [ ] **Step 1: Confirm the current CSS does not provide the requested gap**

Run: `rg -n -C 2 "^\\.about-cta" src/editorial.css`

Expected: the selector sets `margin-bottom: 0`.

- [ ] **Step 2: Add the minimal spacing declaration**

Change the selector to:

```css
.about-cta { margin-bottom: 24px; }
```

- [ ] **Step 3: Build the production bundle**

Run: `npm run build`

Expected: Vite completes successfully.

- [ ] **Step 4: Inspect the rendered route**

Run the Vite development server and inspect `/about` at desktop and mobile widths.

Expected: the CTA is separated from the dark footer by a 24px beige strip, without clipping or overflow.
