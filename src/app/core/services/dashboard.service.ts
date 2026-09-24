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

  // Solo predicciones ya validadas (con ocupación real registrada); vacío si aún no hay ninguna.
  getPredichoVsReal(): Observable<PredichoVsReal[]> {
    return this.api.get<PredichoVsReal[]>('dashboard/predicho-vs-real');
  }
}
