# Búsqueda por nombre en clubes de lectura

## Objetivo

Permitir que las personas encuentren clubes de lectura por su nombre desde la sección pública de búsqueda.

## Interfaz

Agregar un campo de texto con la etiqueta “Buscar por nombre o palabras clave” junto al filtro de género existente. El campo actualiza los resultados al escribir, sin envío de formulario ni recarga.

## Comportamiento

- El texto se compara de forma insensible a mayúsculas y minúsculas únicamente contra el título del club.
- El filtro de texto y el de género se aplican de forma conjunta: un club debe cumplir ambos para mostrarse.
- Un campo vacío conserva el comportamiento actual, incluida la cantidad limitada de resultados cuando no hay género seleccionado.
- Si no hay coincidencias, la interfaz muestra un estado vacío de búsqueda.

## Alcance

- No se modifica la API ni el backend; la lista pública ya cargada se filtra en el navegador.
- No se busca en descripción, lugar ni anfitrión.
- No se cambian datos, rutas ni los filtros de otras secciones.

## Pruebas

Agregar pruebas de estado para la coincidencia por nombre, la combinación con género y el comportamiento sin término de búsqueda. Ejecutar la suite de frontend y el build de producción.
