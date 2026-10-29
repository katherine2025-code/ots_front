# CLAUDE.md — ots_front

## Stack real
- **Angular 20** + **Ionic 8** + **Capacitor 8** (APK Android)
- TypeScript 5.9, strict mode activado
- Chart.js 4, Leaflet 1.9, jsPDF, html2canvas
- `ionic.config.json` → `type: "angular-standalone"` (pero el código usa `IonicModule.forRoot()`, NO las importaciones standalone de `@ionic/angular/standalone`)

## Estructura clave
```
src/app/
  core/
    guards/         # authGuard, noAuthGuard, rolGuard (funciones CanActivateFn)
    services/       # ApiService (base HTTP), AuthService, DashboardService,
                    # PrediccionService, HotelService, OcupacionService, EtlService…
  pages/            # Una carpeta por página; cada una = .page.ts + .page.html + .page.scss
  shared/
    components/     # chart-ocupacion, mapa-lugares
src/environments/
  environment.ts           # dev: apiUrl = http://localhost:3000/api
  environment.prod.ts      # prod: apiUrl = https://ots-backend.serverteced.cloud/api
```

## Comandos
| Tarea | Comando |
|-------|---------|
| Dev (web) | `npm start` → `ng serve` (puerto 8100) |
| Build prod | `npm run build` → `ng build` |
| Lint | `npm run lint` → `ng lint` |
| Test | ⚠️ CONFIRMAR: no hay script de test en package.json |

## Variables de entorno críticas
Las variables están en `src/environments/`, no en `.env`:
- `apiUrl` — URL del backend (web)
- `apiUrlNative` — URL del backend para la APK Capacitor (en dev = IP local de la máquina)

## Convenciones del código
- **Standalone components** con `@Component({ standalone: true, imports: [...] })`
- `IonicModule` importado en cada componente (no las importaciones atómicas de `@ionic/angular/standalone`)
- Guards son funciones `CanActivateFn` que usan `inject()`; no clases
- Todos los services: `@Injectable({ providedIn: 'root' })`
- HTTP pasa SIEMPRE por `ApiService` (`api.get<T>`, `api.post<T>`, etc.)
- Errores en `ApiService.handleError`: transforma HTTP status a mensaje legible; propaga `{ status }` al caller
- Interfaces tipadas en el mismo archivo del servicio que las usa (ej. `PredichoVsReal` en `dashboard.service.ts`)

## Restricciones
- **No mezclar** `IonicModule` con imports standalone de `@ionic/angular/standalone` — rompió el sidebar
- `environment.prod.ts` requiere rebuild tras cualquier cambio de URL
- `apiUrlNative` debe actualizarse si cambia la IP local de desarrollo o el dominio de producción

## Estado actual (oct 2026)
- Rama `chore/retirar-predicciones-guardadas` lista para mergear a `main` (2 commits adelante)
- El endpoint `/dashboard/predicho-vs-real` ahora devuelve `{ datos, mensaje }` (cambió de `PredichoVsReal[]`)
- El servicio `PrediccionService` ya no tiene métodos CRUD de predicciones guardadas

## Pendientes conocidos
- **Sin tests**: cero archivos `.spec.ts` con casos reales
- El README dice Vue 3 + Vite — es incorrecto; el código real es Angular + Ionic
- El rol Administrador (id_rol=1) ve la página Predicciones pero no tiene funcionalidad útil en ella
