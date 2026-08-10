# Menú de compartir horizontal

## Objetivo

Modernizar el menú de compartir para libros y clubes de lectura con una misma presentación horizontal y compacta.

## Experiencia

- El botón `Compartir` conserva su comportamiento de apertura.
- Al abrirse, muestra una barra flotante horizontal con acciones para WhatsApp, Instagram Story, Telegram y copiar enlace.
- Instagram Story se mantiene como una sola acción claramente identificada mediante el icono de Instagram y la etiqueta `Story`; se elimina la acción genérica de Instagram para evitar duplicidad.
- Las acciones de WhatsApp, Telegram y copiar enlace mantienen sus enlaces, métricas y mensajes existentes.
- La barra usa el lenguaje visual actual de Bookia: fondo crema, borde suave, sombra discreta, controles redondeados y estados hover/focus accesibles.
- En pantallas pequeñas, el menú permanece dentro del viewport y permite que los controles se reorganicen sin desbordamiento.

## Implementación

- Extraer una estructura de acciones compartida o alinear ambos componentes para que libros y clubes tengan el mismo marcado y clases de estilo.
- Actualizar los estilos de `.book-share-menu` y `.book-share-options` para el layout horizontal, las acciones de icono y la acción etiquetada Story.
- Conservar la generación de archivos de Story y todos los flujos de errores, carga y analítica actuales.

## Verificación

- Ejecutar las pruebas y el build existentes.
- Revisar las superficies que muestran el menú de libros y de clubes en escritorio y móvil.
- Confirmar que WhatsApp, Story, Telegram y copiar enlace siguen disparando sus comportamientos y eventos correspondientes.

## Fuera de alcance

- No se modifican las URLs compartidas, el contenido de los mensajes, las integraciones externas ni la analítica.
