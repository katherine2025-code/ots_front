import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';

@Injectable({
  providedIn: 'root'
})
export class OcupacionService {
  constructor(private api: ApiService) {}

  getOcupacionGeneral(filtros?: any): Observable<any[]> {
    return this.api.get<any[]>('ocupacion', filtros);
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