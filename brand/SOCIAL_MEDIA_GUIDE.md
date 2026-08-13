# Bookia · Guía para redes sociales

Esta guía adapta la identidad visual actual del frontend a comunicación externa. Usa la capa editorial dominante: papel/crema, verde bosque y coral, con Fraunces + Manrope e ilustración librera cálida.

## Base visual

- Fondo preferido: `#F7F1E6` con textura de papel discreta; también crema `#FFFAF0`.
- Ancla visual: `#0B2D24` o `#123F32` para bloques, marcos o piezas de alto contraste.
- CTA y acentos: `#E85D3F`; hover no aplica en piezas estáticas, por lo que se usa una sola vez como foco de acción.
- Tipografía: Fraunces 600/700 para titulares; Manrope 400–800 para explicación, datos y CTA.
- Estilo: editorial, sereno, cercano y tangible; libros, librerías, plantas, lectura compartida y materialidad de papel.

No reemplazar el verde por azul debido al logo ni por la paleta marrón heredada de `src/styles.css`. Si se usa un logo existente, emplearlo sin recoloración.

## Formato principal de Instagram

**Lienzo:** 1080 × 1350 px (4:5).

### Zona segura operativa

Estas medidas no proceden del CSS: son una adaptación conservadora para publicación social.

| Borde | Margen mínimo | Área útil resultante |
| --- | ---: | --- |
| Izquierdo y derecho | 96 px | 888 px de ancho para texto y logo |
| Superior | 120 px | Evita sensación de contenido pegado al borde |
| Inferior | 160 px | Protege CTA, firma y datos de interfaz/crop |

Mantener titulares, logotipo, precios, fecha, CTA y texto legal dentro de esta zona. Las ilustraciones de borde, grano o textura pueden salir de ella. Para carruseles, usar la misma grilla en cada lámina para que el relato sea continuo.

## Publicaciones de feed

- Usar una idea editorial por publicación: descubrir un libro, conocer una librería, invitar a un club, explicar una función o activar una acción.
- Componer con titular Fraunces grande, una bajada breve Manrope y, como máximo, un CTA coral.
- Alternar fondos de papel y bloques de verde profundo para crear ritmo de grilla; no usar coral como fondo de cada pieza.
- Ubicar el logo pequeño y con aire, preferentemente en una esquina dentro de la zona segura. No competir con el titular.
- Cuando haya una foto/ilustración compleja, añadir una superficie crema o verde para sostener el copy legible.

## Carruseles

Estructura recomendada de 4–6 láminas:

1. Portada: una promesa corta o pregunta, arte librero y marca discreta.
2. Contexto: el problema, dato o deseo del lector/librería.
3. Desarrollo: una idea por lámina, con cards o etiquetas inspiradas en la interfaz.
4. Prueba o utilidad: libro, librería, club o función concreta.
5. Cierre: CTA coral claro y destino (Bookia, enlace en bio, contacto o búsqueda).

Mantener la paleta y el sistema de márgenes; no convertir cada lámina en una pantalla de producto. Para datos, usar píldoras, bordes finos y separadores sutiles, no tablas densas.

## Stories

**Lienzo recomendado:** 1080 × 1920 px (9:16). El propio frontend genera stories con esta resolución en `src/readingClubSharingState.js`.

- Construir el mensaje en una columna vertical: marca/contexto, pieza principal, CTA.
- Mantener texto y logo lejos de bordes superior e inferior; como regla operativa, dejar 140 px laterales, 220 px arriba y 280 px abajo para evitar zonas de interfaz de Instagram.
- Usar el logo cuadrado existente cuando corresponda, sin editarlo; el generador de stories del producto también usa `logo-cuadrado.png`.
- Priorizar fondo crema con bloque verde profundo, o fondo verde con texto crema y acento coral. Un libro/tapa puede ser protagonista; no apilar más de una escena.
- Para stickers/enlaces, dejar un bloque inferior libre y garantizar contraste.

## Banners y anuncios

- Adaptar la composición, no estirar una pieza 4:5: conservar área de texto, arte y CTA como bloques separados.
- En formatos horizontales, llevar el titular y CTA a una mitad sobre papel/crema, y la ilustración de librería a la otra. En formatos verticales, usar secuencia vertical.
- La primera lectura debe ser: qué ofrece Bookia, para quién y cuál es el siguiente paso. El detalle queda en copy secundario.
- Para anuncios de librerías, enfatizar catálogo, cercanía y contacto directo; para lectores, descubrimiento, comunidad y disponibilidad a confirmar.
- Evitar promesas de compra, pago o envío de libros por parte de lectores que el producto no hace: Bookia es una plataforma de descubrimiento y contacto entre lectores y librerías. Esta regla no aplica a la suscripción de Bookia para librerías.

## Imagen e IA para redes

Pedir ilustración editorial de papel texturado, tinta suave o collage recortado; paleta papel/crema, verde bosque y coral; librerías de barrio, anaqueles, libros físicos, hojas y personas lectoras diversas. Luz cálida, mate, composición minimalista y espacio negativo para texto.

Evitar neón, estética tech fría, render plástico, fotografías de stock corporativas, texto generado dentro de la imagen, fondos negros sólidos, degradados agresivos y azules eléctricos/violetas como paleta principal.

## Lista de control previa a publicar

- ¿El mensaje principal se entiende en un segundo?
- ¿Titular, logo y CTA respetan la zona segura?
- ¿La tipografía y los colores coinciden con la capa editorial del frontend?
- ¿Hay contraste suficiente sobre el fondo y la ilustración?
- ¿El coral está reservado para la acción o el foco principal?
- ¿Se usaron assets existentes sin alterarlos y se evitó confundir la marca con proveedores externos?
