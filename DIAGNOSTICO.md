# Diagnóstico de cambios — App OTS (frontend)

> Registro para colaboración. Cada tarea lista: **archivo · cambio · motivo**, su estado y los pendientes.
> Rama de estos cambios: `feat/ui-movil-icono-cronograma`. Fecha: 2026-11-06.

---

## 1. Cronograma — rediseño y explicación del "sin asignar"

**Diagnóstico:** el cronograma mostraba muchos encuestadores como *"sin asignar"* con metas en 0
(ej. `45/0`). **No era bug:** el avance se cuenta en vivo de `respuestas_encuestas`, pero la meta/asignación
vive en `cronograma_encuestas` (se llena al crear la jornada seleccionando encuestadores). La jornada
"Día de los Difuntos" se creó sin pre-asignar, así que el sistema los marca como *trabajo no planificado*.
Los datos SÍ se guardaron (~1842 turísticas + 38 hoteles).

| Archivo | Cambio | Motivo |
|---|---|---|
| `src/app/pages/cronograma/cronograma.page.ts` | Getters `filasConMeta`, `filasSinMeta`, `mostrarSecciones` | Separar encuestadores con meta de los que solo recolectaron |
| `src/app/pages/cronograma/cronograma.page.html` | Matriz dividida en **"Con meta asignada"** y **"Recolección sin meta"**; celdas muestran solo el número cuando la meta es 0 (`105`, no `105/0`); banner informativo; KPIs sin el `/0`; plantilla de fila reutilizable | Que no se vea desordenado y se entienda el "sin asignar" |
| `src/app/pages/cronograma/cronograma.page.scss` | Estilos de encabezados de sección, banner ámbar, atenuación del `/meta` | Jerarquía visual clara |

**Estado:** ✅ compila. Pendiente de revisión visual.
**Nota:** se descartó una pantalla aparte "Por encuestador"; el conteo por encuestador se trabaja dentro del cronograma.

---

## 2. Responsividad móvil — barra de menú y cerrar sesión

**Diagnóstico:** en el teléfono no había forma de abrir el menú lateral (el logout vivía dentro de ese menú),
porque ninguna página tenía botón de menú. Además "todo se veía muy grande" (el WebView respetaba el tamaño
de fuente del sistema Android).

| Archivo | Cambio | Motivo |
|---|---|---|
| `src/app/shared/components/header/header.component.html` | Barra superior con `ion-menu-button` (hamburguesa) + título + botón cerrar sesión | Acceso a menú y logout en móvil, todos los roles |
| `src/app/shared/components/header/header.component.scss` | `:host { display: contents }` | Que el contenido no quede tapado bajo la barra (layout flex de Ionic) |
| `src/app/shared/components/sidebar/sidebar.component.html` | `menuId="menu-principal"` en `ion-menu` | Enlazar el botón al menú de forma explícita |
| `dashboard, cronograma, encuestas, etl, mis-encuestas, ocupacion, predicciones, reportes, usuarios` (`.page.html` + `.page.ts`) | Agregado `<app-header title="...">` + import de `HeaderComponent` | Que cada rol vea menú y logout en su pantalla |
| `src/app/pages/perfil/perfil.page.html` | Hamburguesa en su toolbar existente | Mismo acceso para el Investigador |
| `src/app/app.component.ts/html/scss` | (Se probó y quitó un botón flotante) | Redundante con la hamburguesa del header |
| `android/.../MainActivity.java` | `webView.getSettings().setTextZoom(100)` | Que el tamaño de fuente del sistema no agrande la app |

**Estado:** ✅ compila.
**PENDIENTE / A VERIFICAR:** Katherine reporta que al tocar ☰ el menú no aparece en el móvil. Falta confirmar
en `localhost:8100` (vista móvil del navegador) si: (a) aparece la barra y el ☰, (b) al tocar ☰ el menú se
desliza. Si en localhost funciona, en el teléfono solo falta **reinstalar el APK** (no basta `cap sync`, hay
que recompilar e instalar). Si no funciona en localhost, revisar `ion-split-pane`/`ion-menu`.

---

## 3. Ícono del APK

**Diagnóstico:** el APK usaba el ícono genérico de Capacitor. El ícono del launcher Android **no** se puede
actualizar por internet (limitación del SO): requiere recompilar. No había una imagen cuadrada de calidad
(el logo del proyecto es banner 402×60).

| Archivo | Cambio | Motivo |
|---|---|---|
| `resources/icon.png` | Máster cuadrado generado: marca "OTS" (carita + TS) extraída del logo, centrada en blanco | Fuente del ícono |
| `android/app/src/main/res/mipmap-*/ic_launcher*.png` | Regenerados (cuadrado, redondo, foreground adaptativo) en las 5 densidades | Ícono OTS en el APK |

**Estado:** ✅ generado. Entra al reinstalar el APK.
**Nota:** calidad limitada por la baja resolución de la fuente. Si hay una marca OTS cuadrada en alta
resolución real, dejarla en `resources/icon.png` y regenerar con `scripts`/PIL en un paso.

---

## 4. Microservicio ML (503 en producción) — SIN cambio de código

**Diagnóstico:** los 503 en `/api/predicciones/ml/metricas`, `/api/dashboard/predicho-vs-real` y
`/api/etl/procesar` son porque el **microservicio Python de ML está caído/inalcanzable en Dokploy**, no es
bug. El backend Node + MySQL siguen bien (Reportes, Cronograma, Encuestas funcionan; la recolección no se
afecta). A revisar en Dokploy: estado/logs del microservicio, `GET /health`, `ML_SERVICE_URL`, `DB_*`.
El mensaje "A listener indicated an asynchronous response..." es ruido de una extensión de Chrome.

---

## Cómo construir / desplegar

- **Web (localhost):** `npm start` → `http://localhost:8100`.
- **Build web:** `ng build --configuration production` (salida en `www/`, gitignored).
- **APK (3 pasos, TODOS obligatorios para ver cambios):**
  1. `ng build --configuration production`  (genera `www/`)
  2. `npx cap sync android`  (copia `www/` → `android/.../assets/public`)
  3. `cd android && ./gradlew assembleDebug`  (construye el APK)
  → APK en `android/app/build/outputs/apk/debug/app-debug.apk`. **Desinstalar el OTS viejo del teléfono** e
  instalar el nuevo. `cap sync` **NO** construye ni instala; sin el paso 3 el APK queda igual.
  - **Gradle:** fijado en **8.14.3** (compatible con AGP 8.13.0). Si `cap sync` vuelve a subirlo (ej. a 9.7.x),
    el build falla; restaurar con `git checkout -- android/gradle/wrapper/gradle-wrapper.properties`.
- **Producción web (Dokploy):** commit/push + redeploy del front. Backend es app separada.

## Pendientes
- [ ] Verificar/arreglar que el menú se abra en móvil (ver sección 2).
- [ ] Reinstalar APK para ver ícono + menú + textZoom juntos.
- [ ] Revisar/levantar el microservicio ML en Dokploy (503).
- [ ] Desplegar a producción cuando esté validado.
