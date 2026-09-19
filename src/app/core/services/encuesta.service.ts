import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
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
}

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

  getEncuestaPorTipo(tipo: TipoEncuesta): Observable<Encuesta> {
    return this.api.get<Encuesta>(`encuestas/tipo/${tipo}`);
  }

  actualizarEncuesta(id: number, encuesta: Partial<Encuesta>): Observable<Encuesta> {
    return this.api.put<Encuesta>(`encuestas/${id}`, encuesta);
  }

  cambiarEstado(id: number, activa: boolean): Observable<Encuesta> {
    return this.api.patch<Encuesta>(`encuestas/${id}/estado`, { activa });
  }
}
