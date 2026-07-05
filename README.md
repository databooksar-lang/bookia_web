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

## Publicacion en GitHub Pages

- El sitio se publica con GitHub Actions desde la rama principal.
- Para el repo `bookia_web`, el build usa `VITE_BASE_PATH=/bookia_web/` para que las rutas funcionen en Pages.
- Define `VITE_API_BASE_URL` en `Settings > Secrets and variables > Actions > Variables` del repositorio, apuntando a la API publica.
- En GitHub, activa `Settings > Pages > Build and deployment > Source: GitHub Actions`.

## Integracion con el backend

- Los `fetch` usan `VITE_API_BASE_URL` cuando existe.
- Las tapas del catalogo se resuelven contra la misma base usando el helper compartido de `src/api.js`.
- El backend debe permitir el origen del frontend en `FRONTEND_ORIGINS` y, si se usan cookies entre dominios, configurar `SESSION_COOKIE_SECURE`, `SESSION_COOKIE_SAMESITE` y `SESSION_COOKIE_DOMAIN`.
