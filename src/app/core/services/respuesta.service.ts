import { Injectable } from '@angular/core';
import { Observable, firstValueFrom } from 'rxjs';
import { ApiService } from './api.service';
import { TipoEncuesta } from './encuesta.service';

export interface RegistroRespuesta {
  uuid: string;
  tipo: TipoEncuesta;
  fecha: string;
  respuestas: Record<string, any>;
}

export interface RespuestaGuardada {
  id: number;
  tipo: TipoEncuesta;
  encuesta: string;
  encuestador: string | null;
  fecha: string;
  respuestas: Record<string, any>;
}

const CLAVE_PENDIENTES = 'respuestas_pendientes';

@Injectable({
  providedIn: 'root'
})
export class RespuestaService {
  private sincronizando = false;

  constructor(private api: ApiService) {}

  // Envía la encuesta al servidor. Si falla por falta de conexión o del servidor,
  // queda en el dispositivo y se reintenta después (no se pierde el dato de campo).
  // Errores de validación (400/403/404) no se reintentan: se devuelven al usuario.
  async registrar(tipo: TipoEncuesta, respuestas: Record<string, any>): Promise<'enviada' | 'pendiente'> {
    const registro: RegistroRespuesta = {
      uuid: this.generarUuid(),
      tipo,
      fecha: new Date().toISOString(),
      respuestas
    };

    try {
      await firstValueFrom(this.api.post('respuestas', registro));
      return 'enviada';
    } catch (error: any) {
      if (!this.esErrorDeConexion(error)) throw error;
      this.guardarPendiente(registro);
      return 'pendiente';
    }
  }

  totalPendientes(): number {
    return this.leerPendientes().length;
  }

  // Reintenta el envío de lo que quedó guardado en el dispositivo
  async sincronizarPendientes(): Promise<number> {
    if (this.sincronizando) return 0;
    this.sincronizando = true;

    let enviadas = 0;
    try {
      for (const registro of this.leerPendientes()) {
        try {
          await firstValueFrom(this.api.post('respuestas', registro));
          this.quitarPendiente(registro.uuid);
          enviadas++;
        } catch (error: any) {
          if (this.esErrorDeConexion(error)) break;  // sin conexión: se intenta más tarde
          // El servidor la rechazó (p. ej. encuesta inactiva): se conserva para no perder el dato
          console.error('[Respuestas] Pendiente rechazado por el servidor:', error.message);
        }
      }
    } finally {
      this.sincronizando = false;
    }
    return enviadas;
  }

  // ===== Consulta y exportación (Super Admin, Admin e Investigador) =====

  listar(params?: { tipo?: TipoEncuesta; desde?: string; hasta?: string; limite?: number }): Observable<RespuestaGuardada[]> {
    return this.api.get<RespuestaGuardada[]>('respuestas', params);
  }

  exportarCSV(tipo: TipoEncuesta, desde?: string, hasta?: string): Observable<Blob> {
    return this.api.getBlob('respuestas/exportar', { tipo, desde, hasta });
  }

  // ===== Cola local =====

  // Sin conexión (status 0) o falla del servidor (5xx): el dato se conserva para reintentar
  private esErrorDeConexion(error: any): boolean {
    const status = error?.status;
    return status === 0 || status >= 500;
  }

  private leerPendientes(): RegistroRespuesta[] {
    try {
      return JSON.parse(localStorage.getItem(CLAVE_PENDIENTES) || '[]');
    } catch {
      return [];
    }
  }

  private escribirPendientes(pendientes: RegistroRespuesta[]) {
    localStorage.setItem(CLAVE_PENDIENTES, JSON.stringify(pendientes));
  }

  private guardarPendiente(registro: RegistroRespuesta) {
    this.escribirPendientes([...this.leerPendientes(), registro]);
  }

  private quitarPendiente(uuid: string) {
    this.escribirPendientes(this.leerPendientes().filter(r => r.uuid !== uuid));
  }

  private generarUuid(): string {
    if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
      const r = Math.random() * 16 | 0;
      return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
    });
  }
}
