# Bookia Android MVP 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Publicar una aplicación Android de Bookia que comparta el frontend y la API existentes, mantenga las funciones web y agregue sesión móvil segura, navegación nativa, enlaces y notificaciones push.

**Architecture:** Capacitor 8 empaqueta el build React/Vite existente y limita las diferencias de plataforma a módulos bajo `src/mobile/`. FastAPI continúa como única API y extiende las sesiones existentes para aceptar un bearer token móvil almacenado en Android Keystore. Los dispositivos push se registran por cuenta y Firebase Cloud Messaging entrega avisos sin bloquear los flujos principales.

**Tech Stack:** React 18, Vite 8, Capacitor 8, Android API 36, `capacitor-token-vault`, `@capacitor/push-notifications`, FastAPI, SQLAlchemy, PostgreSQL/SQLite tests, Firebase Admin Python.

**Spec:** `docs/superpowers/specs/2026-09-01-android-mvp-design.md`

## Global Constraints

- La web continúa usando cookies HTTP-only y CSRF; el transporte bearer se habilita solamente con `X-Bookia-Client: android`.
- El token móvil se guarda únicamente en Android Keystore mediante `capacitor-token-vault`; nunca en `localStorage` ni `sessionStorage`.
- La carga y edición de catálogo continúa por Telegram en MVP 1.
- No se agregan pagos dentro de Android.
- El proyecto Android debe apuntar a API 36 para cumplir el requisito de Google Play vigente desde el 31 de agosto de 2026.
- Las notificaciones son opt-in y el rechazo del permiso no bloquea ninguna otra función.
- Todo cambio visual se revisa en viewport móvil y desktop; todo cambio de autenticación recibe revisión de seguridad.

---

### Task 1: Contenedor Android reproducible

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Create: `capacitor.config.json`
- Create: `src/mobile/platform.js`
- Create: `tests/mobilePlatform.test.js`
- Modify: `tests/run-tests.js`
- Create: `android/` (generado por Capacitor y luego ajustado a API 36)
- Modify: `.gitignore`
- Modify: `README.md`

**Interfaces:**
- Produces: `isNativeAndroid(): boolean`, `getMobileApiBase(): string`.
- Produces scripts: `mobile:sync`, `mobile:open`, `mobile:build`.

- [ ] **Step 1: Escribir la prueba fallida de detección/configuración móvil**

```js
import assert from "node:assert/strict";
import { createMobilePlatform } from "../src/mobile/platform.js";

export function registerMobilePlatformTests(test) {
  test("detecta Android y exige API HTTPS explícita", () => {
    const platform = createMobilePlatform({ native: true, platform: "android", apiBaseUrl: "https://api.mybookia.app" });
    assert.equal(platform.isNativeAndroid(), true);
    assert.equal(platform.getApiBase(), "https://api.mybookia.app");
  });
  test("conserva /api para la web", () => {
    const platform = createMobilePlatform({ native: false, platform: "web", apiBaseUrl: "" });
    assert.equal(platform.getApiBase(), "/api");
  });
}
```

- [ ] **Step 2: Ejecutar `npm test` y confirmar que falla por el módulo inexistente**

Run: `npm test`
Expected: FAIL con `ERR_MODULE_NOT_FOUND` para `src/mobile/platform.js`.

- [ ] **Step 3: Instalar Capacitor y crear el contenedor**

```powershell
npm install @capacitor/core@^8 @capacitor/android@^8 @capacitor/app@^8 @capacitor/push-notifications@^8 capacitor-token-vault
npm install --save-dev @capacitor/cli@^8
npx cap init Bookia app.mybookia.mobile --web-dir dist
npx cap add android
```

Configurar `capacitor.config.json` con `appId: "app.mybookia.mobile"`, `appName: "Bookia"`, `webDir: "dist"`, `server.androidScheme: "https"` e inclusión explícita de los plugins usados.

- [ ] **Step 4: Implementar `createMobilePlatform` y scripts reproducibles**

```js
export function createMobilePlatform({ native, platform, apiBaseUrl }) {
  return {
    isNativeAndroid: () => Boolean(native && platform === "android"),
    getApiBase: () => native ? String(apiBaseUrl || "").replace(/\/+$/, "") : "/api",
  };
}
```

Los scripts deben ejecutar `vite build`, `cap sync android` y `gradlew.bat bundleRelease` sin modificar el build web existente.

- [ ] **Step 5: Ajustar Android a `compileSdkVersion` y `targetSdkVersion` 36 y desactivar backups de tokens**

En `android/variables.gradle`, usar `compileSdkVersion = 36` y `targetSdkVersion = 36`; en el `<application>` usar `android:allowBackup="false"`.

- [ ] **Step 6: Verificar frontend y contenedor**

Run: `npm test`
Expected: PASS.

Run: `npm run build`
Expected: build Vite exitoso.

Run: `npm run mobile:sync`
Expected: Capacitor copia `dist` y sincroniza plugins.

- [ ] **Step 7: Documentar requisitos Android y commit**

```powershell
git add package.json package-lock.json capacitor.config.json src/mobile tests android .gitignore README.md
git commit -m "feat: add Android Capacitor shell"
```

### Task 2: Transporte de sesión móvil seguro

**Files:**
- Modify: `../backend/app/api/web_app.py`
- Modify: `../backend/app/core/auth.py`
- Modify: `../backend/tests/test_bookia_api.py`
- Create: `src/mobile/sessionVault.js`
- Create: `tests/mobileSessionVault.test.js`
- Modify: `src/api.js`
- Modify: `src/pages/AuthPages.jsx`
- Modify: `src/pages/RegisterPage.jsx`
- Modify: `tests/run-tests.js`

**Interfaces:**
- Backend consumes: `Authorization: Bearer <opaque-session-token>` plus `X-Bookia-Client: android`.
- Backend produces on mobile login/register: `mobile_session_token: string`, `expires_at: ISO-8601 string`.
- Frontend produces: `getMobileSessionToken(): Promise<string>`, `setMobileSessionToken(token: string): Promise<void>`, `clearMobileSessionToken(): Promise<void>`.

- [ ] **Step 1: Escribir pruebas backend fallidas**

```python
def test_android_login_returns_bearer_session(client):
    response = client.post("/auth/login", headers={"X-Bookia-Client": "android"}, json={"email": OWNER_EMAIL, "password": OWNER_PASSWORD})
    assert response.status_code == 200
    token = response.json()["mobile_session_token"]
    me = client.get("/me", headers={"X-Bookia-Client": "android", "Authorization": f"Bearer {token}"})
    assert me.status_code == 200

def test_bearer_without_android_client_header_is_rejected(client):
    assert client.get("/me", headers={"Authorization": "Bearer invalid"}).status_code == 401
```

- [ ] **Step 2: Ejecutar prueba dirigida y confirmar el fallo**

Run: `python -m unittest tests.test_bookia_api`
Expected: FAIL porque login aún no devuelve `mobile_session_token`.

- [ ] **Step 3: Extender la resolución de sesión sin debilitar cookies/CSRF**

Agregar un extractor que acepte bearer únicamente cuando `X-Bookia-Client == "android"`, aplique `hash_session_token`, verifique vencimiento y reutilice `BookstoreSession`. Las mutaciones bearer no requieren CSRF porque no dependen de cookies; las mutaciones web conservan la validación actual sin cambios.

- [ ] **Step 4: Hacer que login y registro devuelvan el token solo al cliente Android**

```python
if request.headers.get("X-Bookia-Client") == "android":
    payload["mobile_session_token"] = token
    payload["expires_at"] = expires_at.isoformat()
```

No incluir este campo en respuestas web ni logs.

- [ ] **Step 5: Escribir pruebas frontend fallidas para vault y headers**

```js
test("agrega bearer Android sin afectar requests web", async () => {
  const headers = await buildAuthHeaders({ nativeAndroid: true, token: "secret" });
  assert.equal(headers.Authorization, "Bearer secret");
  assert.equal(headers["X-Bookia-Client"], "android");
});
```

- [ ] **Step 6: Implementar vault y adaptar `apiFetch`**

El módulo usa `TokenVault.setToken`, `TokenVault.getToken` y `TokenVault.clearToken` solamente cuando `Capacitor.isNativePlatform()` y `Capacitor.getPlatform() === "android"`. `apiFetch` obtiene el token antes del fetch, añade ambos headers y limpia el vault después de un 401 o logout.

- [ ] **Step 7: Persistir el token devuelto por login/registro y verificar ambos repos**

Run backend: `python -m unittest tests.test_bookia_api`
Expected: PASS.

Run frontend: `npm test`
Expected: PASS.

- [ ] **Step 8: Commit por repositorio**

```powershell
git -C ..\backend add app tests
git -C ..\backend commit -m "feat: support secure Android sessions"
git add src tests
git commit -m "feat: persist Android sessions securely"
```

### Task 3: Registro de dispositivos push

**Files:**
- Modify: `../backend/app/db/models.py`
- Modify: `../backend/app/db/migrations.py`
- Modify: `../backend/app/api/web_app.py`
- Create: `../backend/app/services/push_notifications.py`
- Modify: `../backend/tests/test_bookia_api.py`
- Modify: `../backend/tests/test_migrations.py`
- Modify: `../backend/requirements.txt`
- Modify: `../backend/requirements.lock`
- Modify: `../backend/README.md`

**Interfaces:**
- Produces DB entity: `PushDevice(account_id, token_hash, encrypted_token, platform, enabled, last_seen_at)` with one row per FCM registration token.
- Produces API: `POST /mobile/push/devices`, `DELETE /mobile/push/devices/current`, `PATCH /mobile/push/preferences`.
- Consumes authenticated bearer session only.

- [ ] **Step 1: Escribir pruebas de migración y API fallidas**

```python
def test_android_account_can_register_and_disable_push_device(client, android_headers):
    created = client.post("/mobile/push/devices", headers=android_headers, json={"token": "fcm-token", "platform": "android"})
    assert created.status_code == 201
    assert created.json() == {"enabled": True}
    disabled = client.delete("/mobile/push/devices/current", headers=android_headers, json={"token": "fcm-token"})
    assert disabled.status_code == 204
```

- [ ] **Step 2: Ejecutar y confirmar fallos 404/modelo inexistente**

Run: `python -m unittest tests.test_bookia_api tests.test_migrations`
Expected: FAIL por endpoints y tabla inexistentes.

- [ ] **Step 3: Crear modelo y migración idempotente**

La tabla usa hash SHA-256 para búsqueda/unicidad y Fernet para cifrar el token recuperable. La clave se deriva de una variable dedicada `PUSH_TOKEN_ENCRYPTION_KEY`; producción falla al habilitar push sin esa clave.

- [ ] **Step 4: Implementar endpoints validados**

Limitar tokens a 4096 caracteres, plataforma exacta `android`, upsert por `token_hash`, cambio seguro de propietario cuando FCM rota el token y desactivación idempotente.

- [ ] **Step 5: Añadir configuración y dependencias de Firebase Admin**

Documentar `FIREBASE_PROJECT_ID`, `GOOGLE_APPLICATION_CREDENTIALS` y `PUSH_TOKEN_ENCRYPTION_KEY`. Bloquear el envío si Firebase no está configurado, pero permitir que la API arranque con push deshabilitado.

- [ ] **Step 6: Ejecutar pruebas y commit**

Run: `python -m unittest tests.test_bookia_api tests.test_migrations`
Expected: PASS.

```powershell
git add app tests requirements.txt requirements.lock README.md
git commit -m "feat: register Android push devices"
```

### Task 4: Cliente Android de permisos y notificaciones

**Files:**
- Create: `src/mobile/pushNotifications.js`
- Create: `tests/mobilePushNotifications.test.js`
- Create: `src/components/NotificationPreferences.jsx`
- Modify: `src/App.jsx`
- Modify: `src/pages/ReaderProfilePage.jsx`
- Modify: `src/pages/DashboardPage.jsx`
- Modify: `src/apiRoutes.js`
- Modify: `src/styles.css`
- Modify: `tests/run-tests.js`

**Interfaces:**
- Produces: `initializePushNotifications({ me, navigate }): Promise<{ status: string }>`.
- Produces: `disablePushNotifications(): Promise<void>`.
- Consumes backend device endpoints from Task 3.

- [ ] **Step 1: Escribir pruebas fallidas de estados de permiso**

```js
test("un permiso rechazado no registra el dispositivo", async () => {
  const result = await initializePushNotifications({ permission: "denied", registerDevice: failIfCalled });
  assert.deepEqual(result, { status: "denied" });
});
```

- [ ] **Step 2: Ejecutar `npm test` y confirmar módulo inexistente**

- [ ] **Step 3: Implementar el adaptador push aislado**

Solicitar permiso únicamente después de autenticación y una acción explícita del usuario. Registrar listeners `registration`, `registrationError`, `pushNotificationReceived` y `pushNotificationActionPerformed`; validar rutas internas con una allowlist antes de llamar `navigate`.

- [ ] **Step 4: Añadir preferencia accesible en perfiles de lector y librería**

Mostrar un único control “Notificaciones” con estados `Activar`, `Activas`, `Bloqueadas por Android` y `Desactivar`. En web no se renderiza.

- [ ] **Step 5: Verificar pruebas, build y revisión visual**

Run: `npm test`
Expected: PASS.

Run: `npm run build`
Expected: PASS.

Revisar `/profile` y `/dashboard` en 390x844 y 1440x900.

- [ ] **Step 6: Commit**

```powershell
git add src tests
git commit -m "feat: add Android notification controls"
```

### Task 5: Entrega FCM y eventos de negocio mínimos

**Files:**
- Modify: `../backend/app/services/push_notifications.py`
- Modify: `../backend/app/api/web_app.py`
- Create: `../backend/tests/test_push_notifications.py`
- Modify: `../backend/tests/test_bookia_api.py`

**Interfaces:**
- Produces: `send_account_notification(db, account_id, title, body, route) -> PushDeliveryResult`.
- Events: nuevo libro para seguidores de una librería; disponibilidad restaurada para lectores que marcaron el libro; nuevo favorito/contacto agregado como aviso agregado y anónimo a la librería.

- [ ] **Step 1: Escribir pruebas fallidas con transport fake**

```python
def test_invalid_fcm_token_is_disabled(db, fake_transport):
    fake_transport.reject_unregistered()
    result = send_account_notification(db, ACCOUNT_ID, "Novedad", "Hay un libro disponible", "/")
    assert result.disabled_tokens == 1
```

- [ ] **Step 2: Implementar transporte Firebase y degradación segura**

Construir `messaging.Message(notification=..., data={"route": safe_route}, token=token)`. Capturar errores por token, desactivar registros no válidos, no incluir correos ni datos personales en payloads y no fallar la operación principal si FCM está caído.

- [ ] **Step 3: Conectar eventos después del commit de base de datos**

Usar `BackgroundTasks` solamente después de persistir el cambio. Deduplicar destinatarios por cuenta y limitar un evento a una notificación por dispositivo.

- [ ] **Step 4: Verificar y commit**

Run: `python -m unittest tests.test_push_notifications tests.test_bookia_api`
Expected: PASS, sin red real.

```powershell
git add app tests
git commit -m "feat: send catalog push notifications"
```

### Task 6: Navegación Android y App Links

**Files:**
- Create: `src/mobile/deepLinks.js`
- Create: `tests/mobileDeepLinks.test.js`
- Create: `src/components/MobileTabBar.jsx`
- Modify: `src/App.jsx`
- Modify: `src/components/SiteChrome.jsx`
- Modify: `src/styles.css`
- Modify: `android/app/src/main/AndroidManifest.xml`
- Create: `public/.well-known/assetlinks.json.example`
- Modify: `README.md`

**Interfaces:**
- Produces: `resolveBookiaDeepLink(url: string): string | null`.
- Accepts HTTPS hosts `mybookia.app` and `www.mybookia.app` and routes `/`, `/bookstores/:slug`, `/readers/:slug`, `/profile`, `/dashboard`.

- [ ] **Step 1: Escribir pruebas fallidas de enlaces permitidos y host hostil**

```js
assert.equal(resolveBookiaDeepLink("https://mybookia.app/bookstores/eterna"), "/bookstores/eterna");
assert.equal(resolveBookiaDeepLink("https://evil.example/bookstores/eterna"), null);
```

- [ ] **Step 2: Implementar parser y listener de `appUrlOpen`**

Rechazar esquemas no HTTPS, traversal, dobles barras y rutas fuera de allowlist. Navegar solamente después de normalizar.

- [ ] **Step 3: Implementar barra inferior para Android**

Tabs: Inicio `/`, Buscar `/?focus=search`, Favoritos `/profile?section=favorites`, Perfil `/profile` o Panel `/dashboard`. Ocultar footer web dentro del contenedor y respetar safe-area insets.

- [ ] **Step 4: Declarar App Links verificables**

Agregar intent filter HTTPS con `android:autoVerify="true"` para ambos hosts. El ejemplo `assetlinks.json` usa el package `app.mybookia.mobile` y documenta reemplazar el fingerprint por el certificado de firma real antes de publicar.

- [ ] **Step 5: Verificar y commit**

Run: `npm test`
Expected: PASS.

Run: `npm run build`
Expected: PASS.

```powershell
git add src tests android public README.md
git commit -m "feat: add Android navigation and app links"
```

### Task 7: Privacidad, configuración de producción y paquete de entrega

**Files:**
- Modify: `src/pages/PrivacyPage.jsx`
- Modify: `src/pages/TermsPage.jsx`
- Modify: `src/pages/CookiePolicyPage.jsx`
- Modify: `README.md`
- Modify: `../backend/README.md`
- Modify: `android/app/src/main/AndroidManifest.xml`
- Create: `docs/android-release-checklist.md`
- Modify: `tests/run-tests.js`

**Interfaces:**
- Produces: checklist de Play Console, Firebase, firma, Data Safety, pruebas internas y rollback.

- [ ] **Step 1: Añadir pruebas de documentación/legal**

Las pruebas deben exigir que Privacidad declare token de dispositivo, Firebase Cloud Messaging, finalidad, desactivación y retención; Términos deben mantener a Bookia como plataforma de descubrimiento/contacto; Cookies debe aclarar que Android usa sesión segura nativa en lugar de cookie web.

- [ ] **Step 2: Actualizar textos y documentación operativa**

Documentar variables exactas, creación del proyecto Firebase, ubicación local de `google-services.json` sin versionarlo, generación de keystore fuera del repositorio y track de prueba interno.

- [ ] **Step 3: Ejecutar la suite completa**

Run frontend: `npm test` y `npm run build`.

Run backend: `python -m unittest discover -s tests`.

Run Android: `npm run mobile:sync` y `android\gradlew.bat -p android bundleDebug`.

Expected: todas las suites pasan y se genera `android/app/build/outputs/bundle/debug/app-debug.aab`.

- [ ] **Step 4: Revisiones finales obligatorias**

Revisión visual en desktop/móvil, revisión de seguridad de bearer/FCM/cifrado, `git diff --check` en ambos repos y confirmación de que no existe `google-services.json`, keystore ni secreto dentro de Git.

- [ ] **Step 5: Commit final de documentación**

```powershell
git add src tests README.md docs android/app/src/main/AndroidManifest.xml
git commit -m "docs: prepare Android MVP release"
git -C ..\backend add README.md
git -C ..\backend commit -m "docs: describe Android push operations"
```
