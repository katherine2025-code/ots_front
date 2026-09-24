import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';

// Se manda como valor de `feriado` para pedir los registros sin feriado asignado
// (cargados desde Kobo, cuyo formulario original no preguntaba esto).
export const SIN_FERIADO = '__sin_feriado__';

export interface FeriadoOcupacion {
  feriado: string;
  total: number;
}

export interface FeriadosOcupacionResponse {
  feriados: FeriadoOcupacion[];
  sinFeriado: number;
}

@Injectable({
  providedIn: 'root'
})
export class OcupacionService {
  constructor(private api: ApiService) {}

  getOcupacionGeneral(filtros?: any): Observable<any[]> {
    return this.api.get<any[]>('ocupacion', filtros);
  }

  // Feriados con registros de ocupación (para el filtro de la pantalla), con cuántos tiene cada uno
  getFeriados(): Observable<FeriadosOcupacionResponse> {
    return this.api.get<FeriadosOcupacionResponse>('ocupacion/feriados');
  }

  getOcupacionPorHotel(idHotel: number, fechaInicio?: string, fechaFin?: string): Observable<any[]> {
    return this.api.get<any[]>(`ocupacion/hotel/${idHotel}`, {
      fecha_inicio: fechaInicio,
      fecha_fin: fechaFin
    });
  }

  getEstadisticas(filtros?: any): Observable<any> {
    return this.api.get<any>('ocupacion/estadisticas', filtros);
  }

  getOcupacionPorTemporada(): Observable<any[]> {
    return this.api.get<any[]>('ocupacion/temporada');
  }

  getOcupacionPorParroquia(): Observable<any[]> {
    return this.api.get<any[]>('ocupacion/parroquia');
  }
}