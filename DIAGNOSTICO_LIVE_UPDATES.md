# Live Updates (OTA del APK) — integrado y listo en rama

Deja el **APK** actualizándose solo con los cambios web (sin reinstalar), igual que la PWA pero
para la app nativa. Se trajo el código de la rama vieja `feat/live-updates` (estaba 44 commits
atrás) **sobre lo de ahora**, aplicando solo lo de Live Updates y **sin** arrastrar regresiones.

## Ramas (ambas `feat/live-updates-integrado`)
- **Front:** `ots_front` → rama `feat/live-updates-integrado` (basada en `feat/tabulacion-app`).
- **Backend:** `backend_ots` → rama `feat/live-updates-integrado` (basada en `feat/tabulacion-app`).

Falta el **push** (lo hace Katherine, el sandbox no autentica):
```
# en ots_front
git push -u origin feat/live-updates-integrado
# en backend_ots
git push -u origin feat/live-updates-integrado
```

## Qué cambió

### Backend (`backend_ots`)
| Archivo | Cambio | Motivo |
|---|---|---|
| `src/controller/appUpdateController.js` | **Nuevo**. `GET /api/app/latest` (público) y lógica de `publicar`. | La app pregunta la última versión; el script publica el bundle. |
| `src/routes/appRoutes.js` | **Nuevo**. Rutas + multer propio para `.zip` (hasta 60MB). | `POST /api/app/publicar` solo Super Administrador (rol 0). |
| `src/routes/index.js` | Monta `/app`. | Activar las rutas. |
| `src/server.js` | Sirve `/app-bundles` (estático, público) + `require('path')`. | Que el teléfono descargue el `.zip`. **Se conservó el arranque resiliente** (no se aplicó el retroceso de la rama vieja). |

### Front (`ots_front`)
| Archivo | Cambio | Motivo |
|---|---|---|
| `package.json` | `@capgo/capacitor-updater`, `archiver` (dev) y script `publicar`. | Plugin OTA + empaquetado + comando de publicación. |
| `capacitor.config.ts` | Bloque `CapacitorUpdater` (`autoUpdate: false`). | OTA auto-hospedado contra NUESTRO backend (no Capgo). |
| `src/app/core/services/update.service.ts` | **Nuevo**. Consulta `/app/latest`, descarga y deja el bundle para el próximo arranque. | El motor del OTA. Solo corre en el APK; en web no hace nada. |
| `src/app/app.component.ts` | Llama `notificarListo()` + `buscarActualizacion()` al arrancar. | Dispara la búsqueda de versión. **NO** se trajo el ajuste de StatusBar de la rama vieja (tema aparte). |
| `scripts/publicar-bundle.mjs` | **Nuevo**. Compila, empaqueta `www/` y lo sube al backend. | Publicar con un comando. |

> Los `environments` NO se tocaron: ya tenían `apiUrlNative` apuntando al backend público.

## Lo que FALTA hacer para que funcione (no es código, es despliegue)

1. **Volumen persistente en Dokploy** para la carpeta `uploads/` del backend (ahí se guardan los
   bundles y `version.json`). **Si no, cada redeploy borra los bundles** y la app se queda sin qué
   descargar.
2. **Redesplegar el backend** con esta rama (expone `/api/app/latest`, `/api/app/publicar` y
   `/app-bundles`).
3. **Compilar el APK UNA vez** con esta rama del front (incluye el plugin) e **instalarlo en los
   teléfonos**. ⚠️ Los APK ya instalados se hicieron **sin** el plugin, así que **nunca** recibirán
   OTA: hay que reemplazarlos esta única vez. Pasos del APK: `ng build` → `cap sync` (fijar **Gradle
   8.14.3**) → `gradlew assembleDebug`.
4. **De ahí en adelante**, cada cambio web se publica con un comando (desde `ots_front`):
   ```powershell
   $env:OTS_EMAIL="correo_superadmin@upse.edu.ec"; $env:OTS_PASS="clave"
   npm run publicar
   ```
   Los teléfonos lo bajan al abrir la app y lo aplican en el **siguiente arranque**.

## Límite
Cambios **nativos** (ícono, plugins, permisos) siguen necesitando recompilar e instalar el APK.
Solo el **contenido web** viaja por OTA.
