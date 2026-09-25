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

  // Entrenar los modelos (Random Forest, XGBoost, Prophet): reservado a Super Administrador
  // (ver prediccionRoutes.js). Pasa por el backend Node en vez de llamar directo al
  // microservicio Python, que es el único lugar donde hoy se controla el rol.
  entrenarModelo(): Observable<any> {
    return this.api.post<any>('predicciones/entrenar', {});
  }

  // Simulador de un día puntual: Super Administrador e Investigador (ver prediccionRoutes.js)
  predecir(datos: any): Observable<any> {
    return this.api.post<any>('predicciones/predict', datos);
  }

  // Proyección por rango de fechas: Super Administrador e Investigador
  predecirRango(fechaInicio: string, fechaFin: string): Observable<any> {
    return this.api.post<any>('predicciones/predecir-rango', { fecha_inicio: fechaInicio, fecha_fin: fechaFin });
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