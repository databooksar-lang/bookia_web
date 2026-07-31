# Copy inclusivo para el panel de ingreso

## Objetivo

Actualizar únicamente el panel verde de la página `/login` para que su mensaje represente tanto a lectores como a librerías.

## Alcance

- Sustituir el título actual del panel por: "Todo el mundo de los libros, en un solo lugar."
- Sustituir el texto descriptivo por: "Ingresá para descubrir libros, conectar con librerías y ser parte de la comunidad Bookia."
- Mantener sin cambios el formulario, sus etiquetas, validaciones, flujos de inicio de sesión y destino posterior al acceso.

## Implementación

El cambio se limitará a los dos textos estáticos del panel lateral de `src/pages/AuthPages.jsx`. No requiere cambios en la API, rutas, estilos, términos, privacidad, cookies ni README.

## Verificación

Se actualizará la prueba de copy de acceso para comprobar los dos textos nuevos y se ejecutarán las pruebas y el build del frontend.
