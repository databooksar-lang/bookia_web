# Reading Club Cover Guidance Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Mostrar en el gestor de clubes la medida recomendada para la portada: 900 × 1200 px, formato vertical.

**Architecture:** Mantener la lógica de carga existente y añadir únicamente una línea de ayuda visible dentro del control de portada. La prueba existente de `readingClubState.test.js` verificará que el componente conserve el texto recomendado.

**Tech Stack:** React 18, Vite y pruebas Node.js existentes del frontend.

**Spec:** `backend/docs/superpowers/specs/2026-08-19-reading-club-cover-design.md`

## Global Constraints

- No cambiar la API, el almacenamiento ni la normalización de imágenes.
- Mantener la medida recomendada alineada con `CATALOG_ITEM_IMAGE_SPEC`: 900 × 1200 px.
- Mantener los formatos aceptados actuales: PNG, JPEG y WebP.
- La ayuda debe ser breve, clara y estar junto al selector “Subir portada”.

---

### Task 1: Agregar y proteger el texto de ayuda de la portada

**Files:**
- Modify: `frontend/src/components/ReadingClubManager.jsx:118`, dentro del control existente “Subir portada”.
- Test: `frontend/tests/readingClubState.test.js`, junto a las aserciones existentes sobre `ReadingClubManager`.

**Interfaces:**
- Consumes: el control de carga de portada existente en `ReadingClubManager`.
- Produces: texto visible `Medida recomendada: 900 × 1200 px (formato vertical).` junto al selector de archivo.

- [ ] **Step 1: Write the failing test**

Agregar una aserción al test `integrates reading clubs in dashboard and public storefront`:

```js
assert.match(managerSource, /Medida recomendada: 900 × 1200 px \(formato vertical\)\./);
```

- [ ] **Step 2: Run the focused test and verify it fails**

Run from `frontend`:

```bash
npm test
```

Expected: FAIL porque `ReadingClubManager.jsx` todavía no contiene la frase recomendada.

- [ ] **Step 3: Write the minimal implementation**

En el `<label className="secondary-button">` que contiene “Subir portada”, agregar inmediatamente después del input visualmente oculto una ayuda accesible, por ejemplo:

```jsx
<small>Medida recomendada: 900 × 1200 px (formato vertical).</small>
```

Conservar sin cambios el `accept`, el flujo `uploadCover` y los estados de carga.

- [ ] **Step 4: Run the frontend tests and verify they pass**

Run from `frontend`:

```bash
npm test
```

Expected: PASS, incluida la nueva aserción sobre la medida recomendada.

- [ ] **Step 5: Run the production build**

Run from `frontend`:

```bash
npm run build
```

Expected: salida exitosa de Vite sin errores de compilación.

- [ ] **Step 6: Review the diff**

```bash
git diff -- frontend/src/components/ReadingClubManager.jsx frontend/tests/readingClubState.test.js
```

Confirmar que el diff solo agrega la indicación y su prueba, sin modificar contratos de carga ni estilos no relacionados.
