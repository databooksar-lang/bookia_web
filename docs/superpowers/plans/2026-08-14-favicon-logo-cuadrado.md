# Favicon con logo cuadrado Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Usar el logo cuadrado de Bookia como favicon y Apple touch icon.

**Architecture:** El `index.html` de Vite declara ambos iconos mediante enlaces HTML estáticos. Se cambiarán exclusivamente las rutas de esos enlaces para reutilizar el archivo existente en `public/images`.

**Tech Stack:** HTML, Vite, Node.js.

## Global Constraints

- Usar exactamente `/images/logo-cuadrado.png`.
- No cambiar logotipos renderizados dentro de la interfaz ni agregar dependencias.

---

### Task 1: Actualizar los iconos del documento HTML

**Files:**
- Modify: `index.html:7-8`
- Test: comprobación textual de `index.html` y `npm run build`

**Interfaces:**
- Consumes: `public/images/logo-cuadrado.png`, servido por Vite como `/images/logo-cuadrado.png`.
- Produces: elementos `<link rel="icon">` y `<link rel="apple-touch-icon">` que apuntan a ese recurso.

- [ ] **Step 1: Verificar el estado actual**

Run: `rg -n 'bookia-logo-circular|logo-cuadrado' index.html`

Expected: ambos enlaces de icono apuntan al logo circular antes del cambio.

- [ ] **Step 2: Aplicar la modificación mínima**

```html
<link rel="icon" type="image/png" href="/images/logo-cuadrado.png" />
<link rel="apple-touch-icon" href="/images/logo-cuadrado.png" />
```

- [ ] **Step 3: Verificar las referencias resultantes**

Run: `rg -n 'rel="(icon|apple-touch-icon)".*logo-cuadrado\.png' index.html`

Expected: dos coincidencias, una para cada tipo de icono.

- [ ] **Step 4: Generar el bundle de producción**

Run: `npm run build`

Expected: Vite termina con código de salida 0.

- [ ] **Step 5: Commit**

```bash
git add index.html docs/superpowers/plans/2026-08-14-favicon-logo-cuadrado.md
git commit -m "fix: use square logo as favicon"
```
