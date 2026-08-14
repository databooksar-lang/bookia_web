# Cambio de favicon a logo cuadrado

## Objetivo

Mostrar `public/images/logo-cuadrado.png` como icono de la pestaña de Bookia y como icono de acceso directo de Apple.

## Diseño

El documento HTML de entrada de Vite (`index.html`) conservará sus dos enlaces de icono actuales, pero ambos apuntarán a `/images/logo-cuadrado.png`. No se modificarán los logotipos usados dentro de la interfaz ni se añadirán dependencias.

## Validación

La comprobación consistirá en confirmar que los dos enlaces del documento HTML referencian el recurso solicitado y generar el bundle de producción con Vite.
