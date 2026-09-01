# Bookia Android MVP 1: diseño

## Objetivo

Publicar la primera aplicación Android de Bookia sin duplicar el producto web ni crear un backend móvil independiente. La aplicación debe usar las mismas cuentas, catálogo y perfiles que la web y ofrecer valor tanto a lectores como a librerías.

## Alcance del MVP 1

### Lectores

- Registro, inicio y cierre de sesión.
- Perfil de lector.
- Búsqueda, filtros y consulta de fichas de libros y librerías.
- Favoritos.
- Contacto con librerías mediante los canales ya expuestos por Bookia.
- Notificaciones push de novedades relevantes.

### Librerías

- Inicio de sesión y perfil público.
- Consulta del catálogo propio y de las métricas esenciales ya disponibles.
- Notificaciones sobre interés o novedades relacionadas con su catálogo cuando el backend disponga del evento correspondiente.

### Fuera de alcance

- Carga, edición o fotografía de libros desde Android; la carga continúa por Telegram.
- Pagos o compras dentro de la app.
- Modo sin conexión completo.
- Aplicación iOS.

## Arquitectura

El frontend React/Vite existente seguirá siendo la única capa de interfaz. Capacitor lo empaquetará en una aplicación Android y proveerá una interfaz mínima para funciones nativas. La web seguirá construyéndose y desplegándose exactamente como hasta ahora.

```text
Web ────────┐
            ├─ React compartido ─ API FastAPI ─ PostgreSQL
Android ────┘       │
                    ├─ Capacitor (Android, enlaces, permisos)
                    └─ Firebase Cloud Messaging (push)
```

La API FastAPI se mantiene como única fuente de datos, autorización y reglas de negocio. No se agregará un backend paralelo. El cliente detectará de forma encapsulada si corre en web o Android para solicitar permisos, registrar el dispositivo o abrir enlaces nativos, sin dispersar condicionales por las pantallas.

## Sesión y seguridad

La experiencia debe conservar la misma identidad del usuario en web y Android, pero la autenticación se revisará para garantizar que funciona de forma segura dentro de la WebView de Capacitor. Las credenciales y tokens de notificación nunca se expondrán en el bundle ni en almacenamiento inseguro. La suscripción a notificaciones requiere un usuario autenticado y consentimiento explícito.

## Notificaciones

1. Al iniciar sesión en Android, la app solicita el permiso de notificaciones mediante el flujo nativo.
2. Si el usuario lo acepta, registra el token del dispositivo en la API junto con plataforma y usuario.
3. La API envía notificaciones a través de Firebase Cloud Messaging ante eventos de novedades relevantes.
4. La pantalla de perfil permite desactivar notificaciones; si se rechaza el permiso, la aplicación conserva todas las demás funciones.
5. Al tocar una notificación, la app resuelve el destino como una ruta interna a la ficha, búsqueda o perfil correspondiente.

## Navegación y enlaces

La app tendrá navegación adaptada a móvil para Inicio, Buscar, Favoritos y Perfil, con acceso al panel de librería para cuentas de ese tipo. Los enlaces públicos de Bookia deben abrir la ficha correspondiente en Android cuando esté instalada y en la web cuando no lo esté.

## Entregables y criterio de salida

- Proyecto Android Capacitor versionado junto con el frontend.
- Archivo Android App Bundle (`.aab`) preparado para Google Play.
- Configuración de identidad de aplicación, iconos, enlaces y política de privacidad actualizada si se requiere por el uso de notificaciones.
- Pruebas automatizadas de rutas y de la lógica aislada de capacidades móviles.
- Prueba manual en dispositivos Android reales: autenticación, búsqueda, favoritos, perfil, panel de librería, permisos, recepción de push y apertura de enlace/notificación.
- La web continúa aprobando sus pruebas y su build sin regresiones.

## Roadmap posterior

### MVP 2: operación móvil de librerías

Carga y edición de libros desde cámara, fotos, ISBN, stock y alertas operativas, manteniendo Telegram como alternativa.

### MVP 3: experiencia avanzada de lectores

Alertas configurables por título, autor y género; feed de novedades, recomendaciones y más personalización.

## Decisiones explícitas

- Android primero; iOS se evalúa después de validar adopción.
- Capacitor es la vía de empaquetado para preservar una base de interfaz compartida.
- Firebase Cloud Messaging es el proveedor de push para Android.
- Telegram sigue siendo el flujo de carga durante MVP 1.
