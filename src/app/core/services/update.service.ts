import { Injectable } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { CapacitorUpdater } from '@capgo/capacitor-updater';
import { environment } from 'src/environments/environment';

/**
 * Live Updates auto-hospedado (OTA del contenido web, sin recompilar el APK).
 *
 * Flujo: al abrir la app (solo en el APK), pregunta al backend por la última versión web.
 * Si hay una más nueva, descarga el paquete y lo deja listo para el PRÓXIMO arranque
 * (no interrumpe al usuario). Sin internet, no hace nada y la app sigue con lo que tiene
 * en caché, así el modo offline del encuestador no se ve afectado.
 *
 * Los cambios NATIVOS (ícono, plugins, textZoom) NO entran por aquí: esos sí requieren
 * recompilar el APK.
 */
@Injectable({ providedIn: 'root' })
export class UpdateService {
  // En el APK se usa el dominio público del backend (igual que ApiService).
  private readonly base = environment.apiUrlNative;

  /**
   * Confirma que el bundle actual cargó bien. Es OBLIGATORIO llamarlo al arrancar;
   * si no, el plugin revierte al bundle anterior por seguridad.
   */
  async notificarListo(): Promise<void> {
    if (!Capacitor.isNativePlatform()) return;
    try {
      await CapacitorUpdater.notifyAppReady();
    } catch {
      /* en web o si el plugin no está, se ignora */
    }
  }

  /**
   * Busca una versión web más nueva en el backend y, si existe, la descarga y la
   * programa para aplicarse en el siguiente arranque de la app.
   */
  async buscarActualizacion(): Promise<void> {
    if (!Capacitor.isNativePlatform()) return; // en navegador no aplica

    try {
      const resp = await fetch(`${this.base}/app/latest`, { cache: 'no-store' });
      if (!resp.ok) return;

      const info = await resp.json() as { version?: string; url?: string };
      if (!info?.version || !info?.url) return;

      const actual = await CapacitorUpdater.current();
      if (actual?.bundle?.version === info.version) return; // ya está al día

      const bundle = await CapacitorUpdater.download({ url: info.url, version: info.version });
      // Se aplica en el próximo arranque (sin recargar de golpe mientras se usa).
      await CapacitorUpdater.next({ id: bundle.id });
    } catch {
      // Sin internet o error de red: se queda con el bundle actual (offline sigue OK).
    }
  }
}
