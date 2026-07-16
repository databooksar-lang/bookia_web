# Bookia Frontend

SPA de React/Vite para el buscador publico, la ficha de librerias y el panel de gestion.

## Requisitos

- Node.js 20 o compatible
- Un backend de Bookia corriendo, por ejemplo en `http://127.0.0.1:8000`

## Variables de entorno

Crea un archivo `.env` a partir de `.env.example`.

```env
VITE_API_BASE_URL=http://127.0.0.1:8000
```

Notas:

- En desarrollo con `npm run dev`, el proxy de Vite redirige `/api/*` al backend local quitando el prefijo `/api`.
- En cualquier despliegue separado del backend, `VITE_API_BASE_URL` debe apuntar al host publico de la API.

## Desarrollo local

```powershell
npm install
npm run dev
```

## Build

```powershell
npm run build
npm run preview
```

## Despliegue en Railway

La recomendacion para Railway es desplegar este repo con el `Dockerfile` incluido.

- Railway detecta el `Dockerfile` y construye el frontend automaticamente.
- El contenedor compila con Vite y luego sirve `dist/` con Caddy.
- Las rutas de la SPA como `/login`, `/dashboard` y `/bookstores/:slug` hacen fallback a `index.html`.
- El servidor escucha en `0.0.0.0` usando el `PORT` que provee Railway.

### Variables de entorno en Railway

Define al menos:

```env
VITE_API_BASE_URL=https://api.bookia.com
```

Notas:

- Usa el dominio publico real de tu backend de Railway.
- Para Railway no hace falta definir `VITE_BASE_PATH`; el valor por defecto `/` ya es correcto.
- Este frontend ahora tambien lee `VITE_API_BASE_URL` en runtime al iniciar el contenedor, para evitar builds publicados con la API vacia o desactualizada.

Si el login de librerias responde "aceptado" pero luego no recupera la sesion, conviene evitar cookies cross-site y publicar el frontend con proxy same-origin hacia la API:

```env
BOOKIA_API_UPSTREAM_URL=https://api.bookia.com
```

Con esa variable:

- Caddy proxyea solo `/api` y `/api/*` al backend, quitando el prefijo `/api` antes de reenviar la request.
- El navegador ve las llamadas como mismo origen bajo `/api`, por lo que la cookie de sesion deja de depender de una configuracion cross-site delicada.
- `VITE_API_BASE_URL` puede quedar vacia o mantenerse como respaldo, pero el contenedor va a priorizar `/api` cuando `BOOKIA_API_UPSTREAM_URL` este configurada.

### Pasos en Railway

1. Crea un nuevo servicio y conecta este repositorio.
2. Deja que Railway detecte el `Dockerfile`.
3. Agrega `VITE_API_BASE_URL` si vas a consultar una API cross-origin, o `BOOKIA_API_UPSTREAM_URL` si vas a usar el proxy same-origin `/api`.
4. Publica el frontend en tu dominio, por ejemplo `bookia.com` o `www.bookia.com`.
5. Verifica que al refrescar rutas internas la app siga cargando sin `404`.

## Publicacion en GitHub Pages

- El sitio se publica con GitHub Actions desde la rama principal.
- Para el repo `bookia_web`, el build usa `VITE_BASE_PATH=/bookia_web/` para que las rutas funcionen en Pages.
- Define `VITE_API_BASE_URL` en `Settings > Secrets and variables > Actions > Variables` del repositorio, apuntando a la API publica.
- En GitHub, activa `Settings > Pages > Build and deployment > Source: GitHub Actions`.

## Integracion con el backend

- Los `fetch` usan `/api` por defecto y `VITE_API_BASE_URL` cuando existe una base externa.
- Las tapas, logos y banners se resuelven contra la misma base usando el helper compartido de `src/api.js`.
- El backend debe permitir el origen del frontend en `FRONTEND_ORIGINS`.
- Como el frontend usa `credentials: "include"`, revisa tambien `SESSION_COOKIE_SECURE`, la politica `SESSION_COOKIE_SAMESITE` y `SESSION_COOKIE_DOMAIN` solo si realmente necesitas compartir cookies entre subdominios.
- Si despliegas este frontend con `BOOKIA_API_UPSTREAM_URL`, las llamadas a la API salen por el mismo origen del frontend bajo `/api` y normalmente ya no hace falta depender de cookies cross-site.


- Si una tapa falla al cargar, el buscador la oculta para evitar imagenes rotas visibles.

