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

- En desarrollo con `npm run dev`, el proxy de Vite ya redirige `/search`, `/bookstores`, `/auth`, `/me`, `/dashboard` y `/catalog` al backend local.
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

### Pasos en Railway

1. Crea un nuevo servicio y conecta este repositorio.
2. Deja que Railway detecte el `Dockerfile`.
3. Agrega `VITE_API_BASE_URL` en las variables del servicio.
4. Publica el frontend en tu dominio, por ejemplo `bookia.com` o `www.bookia.com`.
5. Verifica que al refrescar rutas internas la app siga cargando sin `404`.

## Publicacion en GitHub Pages

- El sitio se publica con GitHub Actions desde la rama principal.
- Para el repo `bookia_web`, el build usa `VITE_BASE_PATH=/bookia_web/` para que las rutas funcionen en Pages.
- Define `VITE_API_BASE_URL` en `Settings > Secrets and variables > Actions > Variables` del repositorio, apuntando a la API publica.
- En GitHub, activa `Settings > Pages > Build and deployment > Source: GitHub Actions`.

## Integracion con el backend

- Los `fetch` usan `VITE_API_BASE_URL` cuando existe.
- Las tapas del catalogo se resuelven contra la misma base usando el helper compartido de `src/api.js`.
- El backend debe permitir el origen del frontend en `FRONTEND_ORIGINS`.
- Como el frontend usa `credentials: "include"`, revisa tambien `SESSION_COOKIE_SECURE`, la politica `SESSION_COOKIE_SAMESITE` y `SESSION_COOKIE_DOMAIN` solo si realmente necesitas compartir cookies entre subdominios.
