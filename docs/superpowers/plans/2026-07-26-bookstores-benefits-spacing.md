# Bookstores Benefits Spacing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a small, isolated visual gap between bookstore cards and their green benefits strip on the home page.

**Architecture:** `BenefitsStrip` is reused by search, bookstores, and reading clubs. The bookstore instance will receive a dedicated CSS class, and `editorial.css` will use that class to add exactly 12 px of top margin without changing other instances.

**Tech Stack:** React 18 JSX, CSS, Node.js built-in assertions, Vite 5.

## Global Constraints

- Add exactly `12px` before only the bookstore benefits strip.
- Do not change the search or reading-club benefits strips.
- Preserve responsive behavior and existing content.
- No legal, privacy, cookies, or README update is required because this is a presentational-only change.
- Verify with `npm test` and `npm run build`.

---

### Task 1: Scope and style the bookstore benefits strip

**Files:**
- Modify: `tests/run-tests.js`
- Modify: `src/pages/PublicPages.jsx`
- Modify: `src/editorial.css`

**Interfaces:**
- Consumes: the `className` supplied to the bookstore `BenefitsStrip` wrapper.
- Produces: the `bookstores-benefits-strip` CSS class, used only by the bookstore benefits strip.

- [ ] **Step 1: Write the failing test**

Add this assertion to `tests/run-tests.js`:

```js
tests.push(["adds a gap only before the bookstore benefits strip", () => {
  const publicPagesSource = readFileSync(new URL("../src/pages/PublicPages.jsx", import.meta.url), "utf8");
  const editorialStyles = readFileSync(new URL("../src/editorial.css", import.meta.url), "utf8");

  assert.match(publicPagesSource, /<BenefitsStrip className="bookstores-benefits-strip" benefits=\{BOOKSTORE_BENEFITS\} ariaLabel="Beneficios para librer\u00EDas" \/>/);
  assert.match(editorialStyles, /\.bookstores-benefits-strip\s*\{[^}]*margin-top:\s*12px;/s);
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test`

Expected: FAIL for `adds a gap only before the bookstore benefits strip`, because the bookstore strip has no dedicated class or margin yet.

- [ ] **Step 3: Implement the minimal change**

Update `BenefitsStrip` to accept `className`, and render it alongside the base class:

```jsx
function BenefitsStrip({ benefits, ariaLabel, className = "" }) {
  return <section className={`benefits-strip ${className}`.trim()} aria-label={ariaLabel}>{benefits.map(([icon, title, text]) => <div key={title}>{icon}<span><strong>{title}</strong><small>{text}</small></span></div>)}</section>;
}
```

Pass the modifier only from `BookstoresSection`:

```jsx
<BenefitsStrip className="bookstores-benefits-strip" benefits={BOOKSTORE_BENEFITS} ariaLabel="Beneficios para librerías" />
```

Add the targeted CSS rule after `.benefits-strip`:

```css
.bookstores-benefits-strip {
  margin-top: 12px;
}
```

- [ ] **Step 4: Run the test suite**

Run: `npm test`

Expected: exit code 0 and `PASS adds a gap only before the bookstore benefits strip`.

- [ ] **Step 5: Build the production frontend**

Run: `npm run build`

Expected: exit code 0 and Vite writes a production bundle to `dist/`.

- [ ] **Step 6: Commit**

```bash
git add tests/run-tests.js src/pages/PublicPages.jsx src/editorial.css docs/superpowers/plans/2026-07-26-bookstores-benefits-spacing.md
git commit -m "fix: space bookstore benefits strip"
```
