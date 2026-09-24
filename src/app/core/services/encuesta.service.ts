import { Injectable } from '@angular/core';
import { Observable, catchError, firstValueFrom, of, tap } from 'rxjs';
import { ApiService } from './api.service';

export type TipoEncuesta = 'turista' | 'hotel';
export type TipoPregunta = 'text' | 'email' | 'number' | 'date' | 'select' | 'multiselect' | 'escala';

export interface PreguntaEncuesta {
  id?: number;
  codigo: string;
  texto: string;
  tipo: TipoPregunta;
  seccion: string;
  obligatoria: boolean;
  orden?: number;
  opciones?: string[];
  maxLength?: number;
  valorDefault?: string;
}

export interface Encuesta {
  id: number;
  nombre: string;
  descripcion: string;
  tipo: TipoEncuesta;
  activa: boolean;
  fechaCreacion: string;
  totalPreguntas: number;
  totalRespuestas?: number;
  preguntas?: PreguntaEncuesta[];
  // Presente solo cuando el cuestionario se sirvió desde la copia guardada en el dispositivo
  // (sin conexión); el resto de las propiedades es igual a como llegó del servidor la última vez.
  _cacheadoEl?: string;
}

const CLAVE_CACHE = (tipo: TipoEncuesta) => `ots_cuestionario_${tipo}`;

@Injectable({
  providedIn: 'root'
})
export class EncuestaService {
  constructor(private api: ApiService) {}

  getEncuestas(): Observable<Encuesta[]> {
    return this.api.get<Encuesta[]>('encuestas');
  }

  getEncuesta(id: number): Observable<Encuesta> {
    return this.api.get<Encuesta>(`encuestas/${id}`);
  }

  // El encuestador trabaja en el campo sin señal: el cuestionario (preguntas y respuestas
  // posibles) se guarda en el dispositivo la última vez que hubo conexión, y si la petición
  // falla por falta de red se sirve esa copia en su lugar, para que el formulario nunca quede
  // en blanco. Si nunca hubo conexión (primer uso del dispositivo) no hay nada que ofrecer y
  // el error original sube tal cual, pidiendo conectarse una vez.
  getEncuestaPorTipo(tipo: TipoEncuesta): Observable<Encuesta> {
    return this.api.get<Encuesta>(`encuestas/tipo/${tipo}`).pipe(
      tap(encuesta => this.guardarEnCache(tipo, encuesta)),
      catchError(error => {
        const cache = this.leerDeCache(tipo);
        if (cache && this.esErrorDeConexion(error)) return of(cache);
        throw error;
      })
    );
  }

  // Descarga y guarda ambos cuestionarios para uso sin conexión. Se llama con la app abierta
  // y conectada (p. ej. al entrar a "Mis Encuestas"), antes de que el encuestador salga a
  // campo. Se resuelve siempre (nunca rechaza) cuando ambos intentos terminan, haya ido bien
  // o mal, para que quien llama pueda refrescar su indicador sin quedar pendiente de un error.
  async precargarCuestionarios(): Promise<void> {
    // .catch() en cada promesa (en vez de Promise.allSettled, no disponible con el target de
    // TS de este proyecto) para que un tipo que falle no tumbe la descarga del otro.
    await Promise.all(
      (['turista', 'hotel'] as TipoEncuesta[]).map(tipo =>
        firstValueFrom(this.api.get<Encuesta>(`encuestas/tipo/${tipo}`))
          .then(encuesta => this.guardarEnCache(tipo, encuesta))
          .catch(() => { /* sin conexión o sin permiso: se deja la copia que ya hubiera */ })
      )
    );
  }

  private guardarEnCache(tipo: TipoEncuesta, encuesta: Encuesta): void {
    try {
      const { _cacheadoEl, ...limpio } = encuesta;
      localStorage.setItem(CLAVE_CACHE(tipo), JSON.stringify({ encuesta: limpio, fecha: new Date().toISOString() }));
    } catch { /* almacenamiento no disponible o lleno: seguimos solo con lo que llegó por red */ }
  }

  // Fecha en que se guardó cada cuestionario en este dispositivo (null si nunca se guardó),
  // para mostrarle al encuestador que ya puede trabajar sin conexión antes de salir a campo.
  estadoCache(): Record<TipoEncuesta, string | null> {
    return {
      turista: this.leerDeCache('turista')?._cacheadoEl || null,
      hotel: this.leerDeCache('hotel')?._cacheadoEl || null
    };
  }

  private leerDeCache(tipo: TipoEncuesta): Encuesta | null {
    try {
      const crudo = localStorage.getItem(CLAVE_CACHE(tipo));
      if (!crudo) return null;
      const { encuesta, fecha } = JSON.parse(crudo);
      return { ...encuesta, _cacheadoEl: fecha };
    } catch {
      return null;
    }
  }

  // Mismo criterio que RespuestaService: sin conexión (status 0) o falla del servidor (5xx).
  private esErrorDeConexion(error: any): boolean {
    const status = error?.status;
    return status === 0 || status >= 500;
  }

  actualizarEncuesta(id: number, encuesta: Partial<Encuesta>): Observable<Encuesta> {
    return this.api.put<Encuesta>(`encuestas/${id}`, encuesta);
  }

  cambiarEstado(id: number, activa: boolean): Observable<Encuesta> {
    return this.api.patch<Encuesta>(`encuestas/${id}/estado`, { activa });
  }
}
