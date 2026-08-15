# Perfil lector: jerarquía editorial entre secciones

## Objetivo

Hacer que las áreas de edición y consulta del perfil lector se distingan a primera vista, sin modificar rutas, datos ni acciones.

## Diseño aprobado

- El perfil usa bloques editoriales cálidos: superficie papel, borde tenue, acento verde lateral y más espacio entre unidades.
- En `Mi info`, información pública, géneros y pasaporte lector se leen como etapas independientes; los tres grupos del pasaporte conservan su propia unidad visual.
- En `Mis favoritos`, lecturas y librerías seguidas tienen encabezados y superficies diferenciadas.
- En `Libros buscados`, el formulario y el listado se separan visualmente.
- En móvil, los bloques pasan a una sola columna con padding reducido; foco, hover y controles deshabilitados existentes se mantienen.

## Restricciones

- No modificar endpoints, payloads, navegación ni textos de acciones.
- No añadir comportamiento sticky ni alterar la prioridad funcional de `Guardar perfil`.
