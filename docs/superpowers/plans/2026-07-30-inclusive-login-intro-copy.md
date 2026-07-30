# Inclusive Login Intro Copy Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the green `/login` introduction inclusive of both readers and bookstores.

**Architecture:** Change only the static heading and paragraph rendered by `AuthLayout` in `src/pages/AuthPages.jsx`. Extend the existing source-copy regression assertion in `tests/run-tests.js`; authentication behavior, form copy, layout, and routing remain unchanged.

**Tech Stack:** React 18, Vite, Node.js built-in test runner.

## Global Constraints

- The login form and all authentication behavior remain unchanged.
- The heading must be exactly: `Todo el mundo de los libros, en un solo lugar.`
- The description must be exactly: `Ingresá para descubrir libros, conectar con librerías y ser parte de la comunidad Bookia.`
- No legal, privacy, cookie, or README changes are required because data handling and authentication behavior do not change.

---

### Task 1: Update and verify the inclusive login introduction

**Files:**

- Modify: `tests/run-tests.js:466-477`
- Modify: `src/pages/AuthPages.jsx:13-16`

**Interfaces:**

- Consumes: `AuthLayout`, the shared visual layout for all authentication pages.
- Produces: source-level regression coverage that requires the approved reader-and-bookstore-neutral copy.

- [ ] **Step 1: Write the failing regression assertion**

Replace the old auth-layout copy assertions with these exact assertions in the existing `uses inclusive copy across the access flow` test:

```js
assert.match(authPagesSource, /Todo el mundo de los libros, en un solo lugar\./);
assert.match(authPagesSource, /Ingresá para descubrir libros, conectar con librerías y ser parte de la comunidad Bookia\./);
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test`

Expected: FAIL in `uses inclusive copy across the access flow`, because the previous reader-oriented copy is still in `AuthPages.jsx`.

- [ ] **Step 3: Write the minimal implementation**

Replace only the two static strings in the `auth-intro` aside:

```jsx
<h1>Todo el mundo de los libros, en un solo lugar.</h1>
<p>Ingresá para descubrir libros, conectar con librerías y ser parte de la comunidad Bookia.</p>
```

- [ ] **Step 4: Run the test suite and production build**

Run: `npm test && npm run build`

Expected: tests pass and Vite completes the production build with exit code 0.

- [ ] **Step 5: Commit the implementation**

```bash
git add src/pages/AuthPages.jsx tests/run-tests.js
git commit -m "fix: generalize login intro copy"
```
