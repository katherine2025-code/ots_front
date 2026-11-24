# Instalar aplicación OTS desde el login (PWA)

**Qué se pidió:** que en el login salga un botón **"Instalar aplicación OTS"** (como el
"Instalar aplicación SGA" de la UPSE) y que la app instalada NO quede desactualizada
respecto a producción.

## Por qué la app móvil se veía desactualizada
El APK instalado solo se actualiza por OTA con **Live Updates**, que vive en la rama
`feat/live-updates` y **no está activo en el despliegue de producción actual**. Por eso los
cambios que se suben a la web de producción **no llegan al APK ya instalado** (el APK solo
cambia si se recompila y reinstala, o si se activa Live Updates).

La **PWA** resuelve ese mismo problema de raíz: una app instalada desde el navegador
**siempre carga la versión que está en producción**. El service worker que se agregó
**no guarda caché** (cada petición va directo a la red), así que la PWA **nunca queda
desactualizada**.

## Archivos cambiados / agregados

| Archivo | Cambio | Motivo |
|---|---|---|
| `src/manifest.webmanifest` | **Nuevo**. Nombre, íconos, `display: standalone`, colores. | Requisito para que el navegador ofrezca "Instalar la aplicación". |
| `src/sw.js` | **Nuevo**. Service worker mínimo, passthrough, **sin caché**. | Requisito de instalabilidad PWA; sin caché = la app instalada siempre = producción. |
| `src/assets/icon/pwa-192.png`, `pwa-512.png`, `pwa-512-maskable.png` | **Nuevos**. Íconos de la app generados desde `logo_portada.png`. | El ícono que se ve al instalar en el celular / escritorio. |
| `src/index.html` | Enlaza el manifest, agrega `theme-color`, captura el evento de instalación y registra el service worker (**solo en web, no dentro del APK**). | Activar la PWA sin afectar al APK nativo. |
| `angular.json` | `manifest.webmanifest` y `sw.js` se copian a la raíz de `www`. | Que queden servibles en `/manifest.webmanifest` y `/sw.js`. |
| `src/app/pages/login/login.page.html` | Botón **"Instalar aplicación OTS"** (solo visible si el navegador lo permite). | Lo que se pidió. |
| `src/app/pages/login/login.page.ts` | Lógica: detecta si se puede instalar y lanza el diálogo nativo del navegador. | Hace funcionar el botón. |
| `src/app/pages/login/login.page.scss` | Estilo del botón (borde azul OTS, fondo blanco). | Acorde al diseño del login. |

## Cómo probar
1. **Redesplegar el front** en producción (rebuild). En local el botón casi no aparece
   porque PWA necesita HTTPS; producción sí es HTTPS.
2. Abrir el sitio en **Chrome o Edge** (Android o escritorio). En el login aparece
   **"Instalar aplicación OTS"**. Al tocarlo sale el diálogo del navegador para instalar.
3. La app instalada abre en su propia ventana y **siempre muestra lo de producción**.

## Límites (igual que cualquier PWA, incluido el de SGA)
- El botón solo aparece en navegadores basados en **Chromium** (Chrome/Edge) y **si la app
  aún no está instalada**.
- En **iPhone (Safari)** no hay botón automático: se instala con **Compartir → "Agregar a
  inicio"** (limitación de iOS, no del código).
- **No** reemplaza al APK: es una vía alterna de instalación que no se desactualiza. El APK
  nativo sigue igual que antes.
