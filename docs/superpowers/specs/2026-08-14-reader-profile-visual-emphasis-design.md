# Perfil lector: jerarquía visual y emojis

## Objetivo

Mejorar la orientación visual de la pantalla de perfil lector y hacer más visible la entrada al perfil público, sin modificar navegación, datos ni comportamiento.

## Diseño aprobado

- Las pestañas del perfil incorporarán emojis breves y semánticos: `📝 Mi info`, `❤️ Mis favoritos` y `🔎 Libros buscados`.
- Los encabezados internos de favoritos, librerías seguidas y lista de deseos podrán usar el mismo recurso de forma consistente, evitando sobrecargar cada campo del formulario.
- “Ver perfil público” pasará de botón secundario a CTA principal cuando el perfil esté publicado: fondo verde oscuro de Bookia, texto claro, contraste reforzado, tamaño ligeramente mayor y un indicador visual de enlace externo/perfil.
- El CTA conservará su condición de enlace y solo se renderizará cuando el perfil sea público y tenga alias.
- Se mantendrán los breakpoints y el foco visible existentes; los emojis serán texto accesible dentro de las etiquetas, sin depender de imágenes.

## Alcance técnico

- Ajustar los datos de pestañas y títulos en `src/pages/ReaderProfilePage.jsx`.
- Agregar una variante específica para el CTA en `src/editorial.css`, sin cambiar el estilo de otros botones secundarios.
- Actualizar pruebas de fuente si validan las etiquetas exactas.

## Verificación

- Ejecutar la suite existente y el build de frontend.
- Comprobar visualmente desktop y mobile: alineación de emojis, contraste del CTA, wrapping y foco de teclado.
