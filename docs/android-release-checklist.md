# Checklist de lanzamiento Android MVP 1

## Identidad y compilación

- Confirmar package `app.mybookia.mobile`, `compileSdk` y `targetSdk` 36.
- Actualizar `versionCode` y `versionName` antes de cada entrega.
- Ejecutar `npm ci`, `npm test`, `npm run build` y `npm run mobile:sync`.
- Generar el AAB release con JDK 21 y revisar que no use una clave debug.

## Firebase Cloud Messaging

- Crear la app Android `app.mybookia.mobile` dentro del proyecto Firebase de producción.
- Guardar `google-services.json` únicamente en `android/app/`; confirmar que Git lo ignora.
- Crear una cuenta de servicio con el permiso mínimo para FCM y guardar su JSON fuera del repositorio.
- Configurar en la API `FIREBASE_PROJECT_ID`, `GOOGLE_APPLICATION_CREDENTIALS` y una `PUSH_TOKEN_ENCRYPTION_KEY` Fernet estable y exclusiva.
- Agregar `https://localhost` a `FRONTEND_ORIGINS` del backend y probar alta, rotación y baja de un token real.
- Verificar permiso rechazado, permiso concedido, notificación en primer plano, segundo plano y app cerrada.

## Firma y App Links

- Crear el keystore de producción fuera del repositorio y respaldarlo en un gestor seguro.
- Configurar Play App Signing y conservar el certificado de carga por separado.
- Publicar `/.well-known/assetlinks.json` en `mybookia.app` y `www.mybookia.app` con el fingerprint SHA-256 de Play App Signing.
- Ejecutar `adb shell pm get-app-links app.mybookia.mobile` y abrir enlaces de librería, lector, perfil y panel.

## Play Console y privacidad

- Pagar el registro único de Google Play Console si la cuenta aún no existe.
- Completar Data Safety declarando cuenta/perfil, token de dispositivo, notificaciones y proveedores externos.
- Cargar URL pública de Política de Privacidad y comprobar que describe Firebase Cloud Messaging y la desactivación.
- Declarar que la app no vende libros ni procesa pagos del lector; las suscripciones de librerías se administran fuera de la app Android.
- Completar clasificación de contenido, público objetivo, acceso de revisión y ficha de la tienda.

## Prueba interna y control de calidad

- Subir primero al track de prueba interna y agregar cuentas de lector y librería.
- Probar Android 8 (API 26) y Android 13 o superior, orientación vertical, tema claro y conectividad intermitente.
- Verificar login, registro, logout, búsqueda, favoritos, perfiles, panel, Telegram, enlaces externos y ausencia de pagos dentro de Android.
- Confirmar que la web mantiene cookies/CSRF, footer y navegación actuales en móvil y desktop.
- Revisar que ninguna respuesta o log exponga bearer tokens, tokens FCM, credenciales Firebase o claves de firma.

## Evidencia y rollback

- Conservar el AAB, mapping, versión de Git y resultados de pruebas de cada release.
- Confirmar que `google-services.json`, `*.jks`, `*.keystore`, credenciales y `local.properties` no están versionados.
- Ante un problema crítico, detener el rollout en Play Console, volver a la última versión estable y deshabilitar envíos quitando `FIREBASE_PROJECT_ID` mientras se investiga.
