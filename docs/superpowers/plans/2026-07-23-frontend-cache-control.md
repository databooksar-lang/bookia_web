# Frontend Cache-Control Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make returning Bookia users receive the latest deployed SPA entrypoint and runtime configuration without sacrificing cache efficiency for hashed Vite assets.

**Architecture:** The container entrypoint generates the Caddy configuration at runtime, so it is the single source of truth for response headers. Caddy will handle the runtime configuration, immutable Vite assets, and SPA fallback separately. The existing Node test runner will read the shell script and assert that all required policies remain present.

**Tech Stack:** Caddy 2, POSIX shell, Vite 5, Node.js built-in test runner.

## Global Constraints

- Do not add a service worker or a PWA dependency.
- Use `no-cache` for the SPA entrypoint and `/runtime-config.js`.
- Use `public, max-age=31536000, immutable` only for `/assets/*`, whose filenames are content-hashed by Vite.
- Preserve the existing `/api` and `/admin` proxy behavior.
- Verify both `npm test` and `npm run build` after the change.

---

### Task 1: Lock the cache contract with a regression test

**Files:**
- Modify: `tests/run-tests.js:33-56`

**Interfaces:**
- Consumes: `docker-entrypoint.sh` as a UTF-8 string read with `readFileSync`.
- Produces: a test-runner assertion that fails unless the generated Caddy configuration declares the three cache policies.

- [ ] **Step 1: Write the failing test**

Insert this test after the existing Caddy proxy tests in `tests/run-tests.js`:

```js
["sets cache headers that revalidate the SPA and keep hashed assets immutable", () => {
  const entrypoint = readFileSync(new URL("../docker-entrypoint.sh", import.meta.url), "utf8");

  assert.match(entrypoint, /@runtime_config path \/runtime-config\\.js/);
  assert.match(entrypoint, /header @runtime_config Cache-Control "no-cache"/);
  assert.match(entrypoint, /header @vite_assets Cache-Control "public, max-age=31536000, immutable"/);
  assert.match(entrypoint, /header \/index\\.html Cache-Control "no-cache"/);
}],
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test`

Expected: FAIL for `sets cache headers that revalidate the SPA and keep hashed assets immutable`, because `docker-entrypoint.sh` has no cache-header directives yet.

- [ ] **Step 3: Implement the minimal configuration support**

Do not change this task's production file yet; Task 2 adds the smallest `docker-entrypoint.sh` change to satisfy these assertions.

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test`

Expected: PASS after Task 2 adds the cache directives.

- [ ] **Step 5: Commit**

```bash
git add tests/run-tests.js docker-entrypoint.sh
git commit -m "fix: revalidate frontend entrypoint after deploy"
```

### Task 2: Add route-specific Caddy cache controls

**Files:**
- Modify: `docker-entrypoint.sh:37-42`

**Interfaces:**
- Consumes: Caddy's `header` directive, the Vite output paths `/assets/*` and `/index.html`, and generated `/runtime-config.js`.
- Produces: a generated Caddyfile that revalidates the unversioned entry resources and marks only content-hashed assets immutable.

- [ ] **Step 1: Confirm the regression test is failing**

Run: `npm test`

Expected: FAIL for the cache-header test from Task 1 if this is the first execution of the plan.

- [ ] **Step 2: Add the minimal generated Caddy directives**

Within the final `handle` block in `docker-entrypoint.sh`, directly before `try_files {path} /index.html`, add:

```caddyfile
    @runtime_config path /runtime-config.js
    header @runtime_config Cache-Control "no-cache"

    @vite_assets path /assets/*
    header @vite_assets Cache-Control "public, max-age=31536000, immutable"

    header /index.html Cache-Control "no-cache"
```

The surrounding block must remain:

```caddyfile
  handle {
    root * /srv
    encode gzip zstd
    # cache directives go here
    try_files {path} /index.html
    file_server
  }
```

- [ ] **Step 3: Run the test suite**

Run: `npm test`

Expected: exit code 0 and the new cache-header test prints `PASS`.

- [ ] **Step 4: Build the production frontend**

Run: `npm run build`

Expected: exit code 0 and Vite writes the production bundle to `dist/`.

- [ ] **Step 5: Commit the completed production change**

```bash
git add tests/run-tests.js docker-entrypoint.sh
git commit -m "fix: revalidate frontend entrypoint after deploy"
```

### Task 3: Document the deployment verification

**Files:**
- Modify: `README.md:39-85`

**Interfaces:**
- Consumes: the cache policy implemented by Task 2.
- Produces: an operator-facing verification command for production deployments.

- [ ] **Step 1: Write the failing documentation assertion**

Add a test in `tests/run-tests.js`:

```js
["documents how to verify production cache headers", () => {
  const readme = readFileSync(new URL("../README.md", import.meta.url), "utf8");

  assert.match(readme, /curl -I https:\/\/tu-dominio\.com\/runtime-config\.js/);
  assert.match(readme, /Cache-Control: no-cache/);
}],
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test`

Expected: FAIL for `documents how to verify production cache headers`, because the README does not yet give an operator verification procedure.

- [ ] **Step 3: Document deployment verification**

Append this subsection to the Railway deployment section in `README.md`:

```markdown
### Verificacion de cache tras publicar

El HTML de la SPA y `runtime-config.js` se revalidan en cada visita para que las personas usuarias reciban el despliegue vigente. Los assets bajo `/assets/` tienen nombres versionados por Vite y se almacenan por un año.

Despues de publicar, comprueba la cabecera del recurso de configuracion:

```powershell
curl -I https://tu-dominio.com/runtime-config.js
```

La respuesta debe incluir `Cache-Control: no-cache`.
```

- [ ] **Step 4: Run all verification commands**

Run: `npm test; npm run build`

Expected: both commands exit 0, all test cases print `PASS`, and Vite completes a production build.

- [ ] **Step 5: Commit the documentation update**

```bash
git add README.md tests/run-tests.js
git commit -m "docs: explain frontend cache verification"
```
