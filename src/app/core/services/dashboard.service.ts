import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';

export interface OcupacionPorTemporada {
  temporada: string;
  promedio: string;
  registros: number;
}

export interface OcupacionPorParroquia {
  parroquia: string;
  promedio: string;
  registros: number;
}

export interface PredichoVsReal {
  mes: string;
  predicho: number;
  real: number;
  registros: number;
}

// datos vacío + mensaje cuando no hay modelo entrenado o aún no hay registros para comparar.
export interface RespuestaPredichoVsReal {
  datos: PredichoVsReal[];
  mensaje: string | null;
}

@Injectable({
  providedIn: 'root'
})
export class DashboardService {
  constructor(private api: ApiService) {}

  // Ocupación real promedio agrupada por la temporada (Alta/Media) del feriado al que
  // corresponde cada registro - ver dashboardService.js en el backend.
  getOcupacionPorTemporada(): Observable<OcupacionPorTemporada[]> {
    return this.api.get<OcupacionPorTemporada[]>('dashboard/ocupacion-temporada');
  }

  getOcupacionPorParroquia(): Observable<OcupacionPorParroquia[]> {
    return this.api.get<OcupacionPorParroquia[]>('dashboard/ocupacion-parroquia');
  }

  // Ocupación predicha por el modelo en uso vs. la real, por mes (validación histórica del
  // microservicio sobre los registros de ocupación cargados).
  getPredichoVsReal(): Observable<RespuestaPredichoVsReal> {
    return this.api.get<RespuestaPredichoVsReal>('dashboard/predicho-vs-real');
  }
}
