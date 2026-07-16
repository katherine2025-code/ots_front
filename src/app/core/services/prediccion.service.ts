import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';

@Injectable({
  providedIn: 'root'
})
export class PrediccionService {
  constructor(private api: ApiService) {}

  getPredicciones(filtros?: any): Observable<any[]> {
    return this.api.get<any[]>('predicciones', filtros);
  }

  getPrediccionById(id: number): Observable<any> {
    return this.api.get<any>(`predicciones/${id}`);
  }

  generarPrediccion(datos: any): Observable<any> {
    return this.api.post<any>('predicciones/generar', datos);
  }

  validarPrediccion(id: number, observaciones?: string): Observable<any> {
    return this.api.put<any>(`predicciones/${id}/validar`, { observaciones });
  }

  descartarPrediccion(id: number, motivo: string): Observable<any> {
    return this.api.put<any>(`predicciones/${id}/descartar`, { motivo });
  }

  getPrediccionesPorHotel(idHotel: number): Observable<any[]> {
    return this.api.get<any[]>(`predicciones/hotel/${idHotel}`);
  }

  getMetricasModelo(): Observable<any> {
    return this.api.get<any>('predicciones/metricas');
  }
}