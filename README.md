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

Para Railway, la configuracion recomendada es usar proxy same-origin hacia la API:

```env
BOOKIA_API_UPSTREAM_URL=https://api.bookia.com
```

Con esa variable:

- Caddy proxyea solo `/api` y `/api/*` al backend, quitando el prefijo `/api` antes de reenviar la request.
- El navegador ve las llamadas como mismo origen bajo `/api`, por lo que la cookie de sesion deja de depender de una configuracion cross-site delicada.
- `runtime-config.js` queda con `apiBaseUrl: "/api"` al iniciar el contenedor.
- En el backend, `SESSION_COOKIE_SAMESITE=lax` alcanza para este flujo porque el navegador consulta la API desde el mismo origen del frontend.

Si no puedes usar proxy same-origin, define una base externa para que el frontend llame directo al backend:

```env
VITE_API_BASE_URL=https://api.bookia.com
```

Notas:

- Usa el dominio publico real de tu backend de Railway.
- Para Railway no hace falta definir `VITE_BASE_PATH`; el valor por defecto `/` ya es correcto.
- Este frontend lee `VITE_API_BASE_URL` en runtime al iniciar el contenedor, para evitar builds publicados con la API vacia o desactualizada.
- Si falta `BOOKIA_API_UPSTREAM_URL` y el frontend intenta usar `/api`, Caddy responde JSON `503` en `/api/*` en vez de servir la SPA o devolver un 405 sin contexto.

### Pasos en Railway

1. Crea un nuevo servicio y conecta este repositorio.
2. Deja que Railway detecte el `Dockerfile`.
3. Agrega `VITE_API_BASE_URL` si vas a consultar una API cross-origin, o `BOOKIA_API_UPSTREAM_URL` si vas a usar el proxy same-origin `/api`.
4. Publica el frontend en tu dominio, por ejemplo `bookia.com` o `www.bookia.com`.
5. Verifica que al refrescar rutas internas la app siga cargando sin `404`.

### Watch Paths De `bookia_web`

`production` es el unico ambiente permanente. En **Railway -> Service -> Settings -> Build -> Watch Paths**, configura estos patrones para que el servicio se despliegue solo cuando cambie un archivo que afecta su build o runtime:

```text
/src/**
/public/**
/index.html
/package.json
/package-lock.json
/vite.config.js
/Dockerfile
/Caddyfile
/docker-entrypoint.sh
/.dockerignore
/*.png
```

Esta lista es la fuente de verdad de la politica. Si agregas o mueves un archivo que Vite, Docker, Caddy o el contenedor necesitan para construir o ejecutar la web, agrega el nuevo path aqui y en Railway en el mismo cambio.

Los cambios exclusivos en tests, `README.md` u otra documentacion no deben provocar deployments. Si el mismo commit tambien modifica un archivo incluido en los patrones, Railway desplegara `bookia_web`.

Ejemplos:

- `src/App.jsx`, cualquier archivo bajo `public/` o un archivo de configuracion listado: despliega `bookia_web`.
- `README.md` o `tests/run-tests.js` sin otros cambios: no despliega el servicio.

Para verificar la configuracion, guarda los patrones y revisa un commit que solo cambie documentacion. En la actividad de `bookia_web`, Railway debe mostrar el deployment como omitido por no coincidir con los watch paths. Luego confirma que un cambio controlado bajo `src/` si inicia un deployment.

### Verificacion de cache tras publicar

El HTML de la SPA y `runtime-config.js` se revalidan en cada visita para que las personas usuarias reciban el despliegue vigente. Los assets bajo `/assets/` tienen nombres versionados por Vite y se almacenan por un ano.

Despues de publicar, comprueba la cabecera del recurso de configuracion:

```powershell
curl -I https://tu-dominio.com/runtime-config.js
```

La respuesta debe incluir `Cache-Control: no-cache`.

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
- La pestaña `Integraciones` usa los endpoints protegidos `/api/integrations/tiendanube/*`. El inicio OAuth navega al backend; sincronizar y desconectar usan la cookie CSRF compartida. No configures credenciales de Tiendanube en el frontend.
Configuracion de produccion de Bookia (`https://mybookia.app`):

```env
BOOKIA_API_UPSTREAM_URL=https://<servicio-api-privado-o-railway>
```

En el servicio backend, configura explicitamente:

```env
APP_ENV=production
FRONTEND_ORIGINS=https://mybookia.app
FRONTEND_ORIGIN_REGEX=
SESSION_COOKIE_SECURE=true
SESSION_COOKIE_SAMESITE=lax
```

No uses comodines ni subdominios Railway como origen CORS en produccion. Antes de publicar, ejecuta `npm test`, `npm run build` y verifica las cabeceras HTTP de `/` y `/api/healthz`.

## Retorno de suscripciones

El frontend expone `/billing/return` para recibir a la libreria despues de autorizar la suscripcion en Mercado Pago. Configura en el backend `MERCADO_PAGO_BACK_URL=https://mybookia.app/billing/return`. Bookia no solicita un correo pagador antes del checkout: Mercado Pago utiliza la cuenta activa. La pagina intenta confirmar el estado cada 2 segundos, hasta cinco veces, y luego dirige al panel `Suscripcion`, donde se puede consultar el proximo cobro, programar cambios o cancelar la renovacion.


- Si una tapa falla al cargar, el buscador la oculta para evitar imagenes rotas visibles.
