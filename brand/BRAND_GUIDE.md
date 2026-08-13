# Bookia · Guía de identidad visual

Esta guía documenta el sistema visual que existe hoy en el frontend de Bookia. Es una referencia para extender el producto y producir piezas externas; no propone un rediseño.

## 1. Identidad visual general

Bookia combina una interfaz editorial contemporánea con el universo tangible de los libros y las librerías de cercanía. La expresión dominante es cálida, serena y artesanal: papel crema con retícula y grano sutiles, verde bosque profundo, coral como llamada a la acción y composiciones amplias con imágenes libreras.

La interfaz prioriza títulos expresivos de alto contraste, cuerpos sobrios y componentes de bordes suaves. Los libros se presentan como objetos culturales y físicos; las plantas, frentes de librería y detalles botánicos acompañan sin competir con el contenido.

**Fuente primaria de esta lectura:** `src/editorial.css`, cargado después de `src/styles.css` en `src/main.jsx`.

## 2. Paleta de colores

### Tokens editoriales declarados

| Rol | Token | HEX | RGB | Origen |
| --- | --- | --- | --- | --- |
| Papel base | `--paper` | `#F7F1E6` | `247, 241, 230` | `src/editorial.css:5` |
| Papel profundo | `--paper-deep` | `#EDE4D5` | `237, 228, 213` | `src/editorial.css:6` |
| Crema de superficie | `--cream` | `#FFFAF0` | `255, 250, 240` | `src/editorial.css:7` |
| Tinta | `--ink` | `#1E241F` | `30, 36, 31` | `src/editorial.css:8` |
| Texto secundario | `--muted` | `#666B63` | `102, 107, 99` | `src/editorial.css:9` |
| Verde bosque | `--forest` | `#123F32` | `18, 63, 50` | `src/editorial.css:10` |
| Verde bosque profundo | `--forest-deep` | `#0B2D24` | `11, 45, 36` | `src/editorial.css:11` |
| Coral | `--coral` | `#E85D3F` | `232, 93, 63` | `src/editorial.css:12` |
| Coral oscuro | `--coral-dark` | `#BD432B` | `189, 67, 43` | `src/editorial.css:13` |

### Colores de uso recurrente sin token global

| Uso | Valor | Origen y observación |
| --- | --- | --- |
| Verde del header | `#0F4638` / `15, 70, 56` | `src/editorial.css:115`; es distinto de ambos verdes tokenizados. |
| Texto claro de header | `#FFFAF3` / `255, 250, 243` | `src/editorial.css:133`; variante más cálida de `--cream`. |
| Dorado de acción de cuenta | `#C89A2B` / `200, 154, 43` | `src/editorial.css:198`; hover `#B98C23`. Acento localizado, no color primario general. |
| Coral de registro | `#ED684F` / `237, 104, 79` | `src/editorial.css:3939,3977`; variante local de coral. |
| Salmón claro | `#F6A38F` / `246, 163, 143` | `src/editorial.css:957`; aparece sobre fondos oscuros. |
| Verde pálido | `#E7EEE4` / `231, 238, 228` | `src/editorial.css:3946`; uso localizado en registro. |

### Transparencias, líneas y estados

- `--line`: `rgba(30, 36, 31, 0.16)`; bordes sobre papel.
- `--line-light`: `rgba(255, 250, 240, 0.2)`; divisores sobre verde oscuro.
- Focus global: contorno de 3 px en `rgba(232, 93, 63, 0.34)` con desplazamiento de 3 px (`src/editorial.css:75`).
- Los estados semánticos (reservado, oculto, error, éxito) tienen colores locales en `src/editorial.css`; deben mantenerse semánticos y no reutilizarse como acentos de campaña.

## 3. Tipografía y jerarquía

Las familias se cargan desde Google Fonts en `index.html`:

- **Fraunces**, pesos 600 y 700: títulos `h1–h3`, nombre de marca y citas. En CSS base se usa 600 y `letter-spacing: -0.025em` (`src/editorial.css:98`).
- **Manrope**, pesos 400, 500, 600 y 700: interfaz, párrafos, navegación, etiquetas y botones. El cuerpo usa `line-height: 1.6` (`src/editorial.css:34–35`).

| Nivel | Familia / peso | Tamaño detectado | Uso |
| --- | --- | --- | --- |
| Hero principal | Fraunces 600 | `clamp(3.3rem, 6vw, 6rem)` | Titular de portada (`.hero h1`). |
| H1 de secciones especiales | Fraunces 600 | hasta `clamp(3.5rem, 6.5vw, 6.5rem)` | Planes, librerías y Acerca de. |
| H2 de sección | Fraunces 600 | `clamp(2.3rem, 4vw, 4rem)` | Bloques editoriales. |
| H3 de cards | Fraunces 600 | 1.17–1.8rem, según componente | Títulos de libro, tarjeta o bloque. |
| Bajada | Manrope 400 | 1–1.16rem; algunas páginas 1.05–1.16rem | Texto de apoyo. |
| Etiqueta / kicker | Manrope 800 | 0.65–0.78rem, mayúsculas, `letter-spacing` 0.12–0.15em | Categorías y contexto. |
| Botón | Manrope 800 | 0.76–0.86rem | Acción breve y directa. |
| Texto auxiliar | Manrope 400–700 | 0.68–0.85rem | Metadatos y descripciones. |

No introducir una tercera familia tipográfica. Para piezas sociales, mantener Fraunces para un único mensaje protagonista y Manrope para contexto, CTA y datos.

## 4. Logo y activos de marca

### Uso en el producto

- Header: `public/images/bookia-logo-circular-transparent.png`, dentro de un contenedor circular crema de 38×38 px (`src/components/SiteChrome.jsx`, `src/editorial.css:136–150`).
- Footer: `public/images/logo-cuadrado.png` (`src/components/SiteChrome.jsx:14,78`).
- Favicon y Apple touch icon: `public/images/bookia-logo-circular.png` (`index.html:7–8`).
- Stories generadas: `public/images/logo-cuadrado.png` (`src/bookSharingState.js:12`).

### Regla de uso

Usar los archivos existentes sin recolorear, redibujar, estirar ni aplicar filtros. Conservar proporción 1:1 y aire suficiente alrededor. En fondos oscuros, priorizar la variante que el producto usa en el footer; en contenedores pequeños, usar la marca circular transparente dentro de una superficie crema, como el header.

### Inconsistencia documentada

Los logos `logo-sin-fondo.png` y las variantes circulares presentan azul marino y coral luminoso, mientras que la UI dominante utiliza verde bosque, crema y coral. Esta guía no corrige la diferencia: los assets son referencias válidas existentes y se deben emplear tal como están. No derivar un azul nuevo para componentes UI a partir del logo.

## 5. Componentes de interfaz

### Botones

Todos los botones base comparten 48 px de alto mínimo, padding `12px 19px`, radio píldora (`999px`), Manrope 800, 0.86rem y un icono separado 9 px (`src/editorial.css:354–370`).

- **Primario:** fondo `--coral`, texto blanco; hover `--coral-dark` y desplazamiento vertical de −2 px.
- **Secundario:** transparente, texto `--forest`, borde `rgba(18, 63, 50, 0.28)`; hover verde translúcido.
- **Claro:** crema sobre fondos oscuros, texto `--forest-deep`.
- **Outline claro:** transparente, texto crema y borde crema translúcido para fondo oscuro.
- **Peligro:** fondo transparente, texto `#A13E2F`, borde rojo translúcido; 42 px de alto mínimo.

Para comunicación externa, la llamada principal puede usar coral sólido y forma píldora; no usar gradientes marrones como sustituto.

### Inputs y búsqueda

Los inputs generales tienen alto mínimo de 48 px, padding horizontal 15 px, radio 10 px, fondo blanco al 62 %, borde oscuro al 17 % y foco verde con halo de 3 px (`src/editorial.css:308–325`). La búsqueda principal se agrupa en un panel crema de radio 18 px, borde verde translúcido, 8 px de separación interna y sombra suave.

### Cards

La tarjeta editorial típica usa crema translúcida, borde `--line`, radio 12 px y sombra mínima; al hover asciende levemente y adopta `--shadow-card` (`src/editorial.css:567–577`). Hay variantes mayores de 16, 18, 20 y 22 px para modales, bloques destacados y campañas. Las cards de libros agregan el motivo de lomo: radio asimétrico `4px 8px 8px 4px` y sombra lateral.

## 6. Fondos, bordes y sombras

### Fondos

El fondo principal es `--paper` con una grilla verde al 2.5 % cada 32 px y una capa fija de grano al 20 % (`src/editorial.css:27–45`). Las superficies alternan crema translúcida, papel profundo y bloques grandes de verde bosque profundo. Los fondos oscuros usan texto crema y coral o salmón para señalizar.

### Bordes

- Regla habitual: 1 px de `--line`.
- En superficies verdes: 1 px de `--line-light`.
- Los bordes no son negros ni pesados; funcionan como separación editorial tenue.
- Radios recurrentes: 10/12/14 px para controles y cards compactas; 16/18/20/22/24 px para contenedores grandes; `999px` para acciones y tags; 50 % para avatares, marca e iconos circulares.

### Sombras

| Token / patrón | Valor | Uso |
| --- | --- | --- |
| `--shadow-soft` | `0 16px 45px rgba(22, 38, 30, 0.1)` | Paneles y bloques principales. |
| `--shadow-card` | `0 9px 24px rgba(22, 38, 30, 0.08)` | Cards elevadas. |
| Header | `0 10px 26px rgba(15, 70, 56, 0.18)` | Barra persistente. |
| Ilustración hero | `drop-shadow(0 18px 18px rgba(11, 45, 36, 0.14))` | Arte decorativo. |

## 7. Espaciado y composición

No existe un token scale formal de espaciado. Los valores repetidos detectados son 8, 10, 12, 14, 16, 18, 20, 22, 24, 28, 32, 40, 48 px y sus múltiplos. Usar 8 px como unidad de referencia práctica y respetar los valores locales cuando se extienda un componente existente.

- Ancho editorial habitual: `min(1280px, calc(100% - 48px))` en desktop.
- En móvil, varios bloques usan `min(100% - 28px, 100%)`.
- Secciones grandes: 68–100 px de separación vertical; hero principal: 74 px arriba y 68 px abajo.
- Separación dentro de controles: 8–14 px; dentro de cards: 14–32 px; entre columnas principales: 32 px o `clamp(40px, 7vw, 100px)`.

## 8. Iconografía

La iconografía propia está en `src/components/Icons.jsx`: SVG lineales, de trazo actual, sin contenedor por defecto y escalables por prop `size` (habitualmente 15–24 px). Motivos: búsqueda, flecha, ubicación, librería, libro, brillo, menú, ojos, corazón y redes. Usar iconos simples de una tinta que hereden el color del contexto; reservar logos multicolor para marcas de terceros, como Google y Mercado Pago.

## 9. Imágenes e ilustraciones

### Referencias existentes

| Archivo | Uso / carácter |
| --- | --- |
| `public/images/hero-bookia-discovery.webp` | Libros, librería y botánica en collage/papel recortado. Referencia principal del hero. |
| `public/images/bookstores-section-facade.png` | Fachada de librería ilustrada, tinta y papel cálido. |
| `public/images/bookstores-hero-library.png` | Interior de librería en composición vertical. |
| `public/images/reading-clubs-section.png` | Ilustración para comunidad lectora. |
| `public/images/plans-books.png` | Libros ornamentales verde, coral y crema con follaje. |
| `public/images/register/reader-books.png` y `register/bookstore-front.png` | Imágenes de apoyo para registro. |
| `bookia-logo-circular-transparent.png`, `bookia-logo-circular.png`, `logo-cuadrado.png`, `logo-sin-fondo.png` | Referencias de logotipo; ver reglas de logo. |

El estilo visual compatible es editorial e ilustrado, con textura de papel, grano, paleta apagada/cálida y volumen contenido. Las fotos o renders hiperrealistas no son el patrón predominante; si se usan, deben conservar luz cálida, librerías reales, libros físicos y composición serena.

## 10. Buenas prácticas y usos a evitar

### Hacer

- Mantener mucho aire, una jerarquía tipográfica clara y una acción principal por bloque.
- Usar verde profundo para anclar, coral para activar y crema/papel para dar calidez.
- Combinar libros, anaqueles, portadas, vegetación y comunidad lectora con detalle artesanal moderado.
- Aplicar los estados de foco y contraste suficientes en componentes interactivos.

### Evitar

- Cambiar la paleta dominante por azules derivados del logo o por los marrones heredados de `styles.css`.
- Usar neón, acabados cromados, gradientes intensos, fondos negros puros o estética tecnológica fría.
- Saturar una pieza con varios CTA corales, sombras duras o bordes gruesos.
- Estirar logo/ilustraciones, superponer texto sobre zonas detalladas sin una superficie de apoyo o imitar el logo con texto.
- Tratar los colores de error, pago o proveedores como colores de marca.

## 11. AI Image Generation Guidelines

Describir a Bookia como una marca editorial cálida de descubrimiento de libros y librerías de cercanía en Argentina. Pedir ilustración editorial de papel texturado o tinta suave, minimalista pero material, con una composición clara y espacio negativo para copy.

**Paleta a respetar:** papel `#F7F1E6`, crema `#FFFAF0`, verde bosque `#123F32` y `#0B2D24`, coral `#E85D3F`; el papel profundo `#EDE4D5` puede apoyar fondos. El dorado `#C89A2B` es un detalle excepcional. No inferir el azul marino del logo como color dominante de la escena.

**Composición e iluminación:** luz cálida y difusa, tonos mate, contraste moderado, uno o dos focos narrativos y fondos despejados. Reservar una zona tranquila para titular o CTA. Preferir libros abiertos, lomos ilustrados, anaqueles, fachadas de librería, mesas de lectura, plantas y pequeños grupos de lectores diversos.

**Nivel de minimalismo:** formas simples, textura leve y ornamentación botánica puntual. La escena debe sentirse cuidada y cercana, no infantil ni recargada.

**Evitar en prompts:** neón, cyberpunk, interfaces flotantes, brillos metálicos, renders 3D plásticos, stock corporativo genérico, librerías monumentales irreales, exceso de texto generado dentro de la imagen, fondos oscuros absolutos y paletas ajenas de azul eléctrico/violeta/fucsia.

## 12. Design tokens detectados en el frontend

```text
colors
  paper: #F7F1E6
  paper-deep: #EDE4D5
  cream: #FFFAF0
  ink: #1E241F
  muted: #666B63
  forest: #123F32
  forest-deep: #0B2D24
  coral: #E85D3F
  coral-dark: #BD432B

typography
  display: Fraunces, serif; 600/700
  body: Manrope, sans-serif; 400/500/600/700

spacing
  repeated values: 8, 10, 12, 14, 16, 18, 20, 22, 24, 28, 32, 40, 48px

radius
  control: 10px
  card: 12–18px
  feature container: 20–24px
  pill: 999px
  circle: 50%

shadows
  soft: 0 16px 45px rgba(22, 38, 30, .1)
  card: 0 9px 24px rgba(22, 38, 30, .08)

borders
  default: 1px solid rgba(30, 36, 31, .16)
  on-dark: 1px solid rgba(255, 250, 240, .2)
```

### Variantes e inconsistencias activas

`src/styles.css` se carga antes de la capa editorial y declara otra familia de tokens: superficies crema-marrón, acento `#B25C2F`, acento oscuro `#7D3814`, texto suave `#6D5A48`, peligro `#8C3D2E` y sombra marrón. Como ambos CSS permanecen importados, esos valores forman parte del frontend actual para reglas no sobrescritas. Además, la capa editorial referencia `--cream-soft` en componentes de suscripción (`src/editorial.css:4568,4608`) sin declararlo en ninguno de los dos `:root`; esa declaración de fondo queda inválida en CSS y debe tratarse como inconsistencia técnica, no como token reutilizable. Documentarlos no equivale a recomendarlos para nuevas piezas: para extensiones nuevas, seguir la capa editorial y registrar cualquier excepción local de forma explícita.
