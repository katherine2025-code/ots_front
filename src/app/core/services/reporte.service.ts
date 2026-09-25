import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';

@Injectable({
  providedIn: 'root'
})
export class ReporteService {
  constructor(private api: ApiService) {}

  getReportes(): Observable<any[]> {
    return this.api.get<any[]>('reportes');
  }

  // Estadísticas reales de la pantalla de Reportes, con filtro opcional por feriado,
  // rango de fechas y/o año (todos se pueden combinar; se omite el que no se use).
  getEstadisticas(filtros?: { feriado?: string; fechaInicio?: string; fechaFin?: string; anio?: number }): Observable<any> {
    return this.api.get<any>('reportes/estadisticas', filtros);
  }

  // Tabulación pregunta por pregunta de la Encuesta Turística (13 de 37 preguntas: las únicas
  // que hoy tienen columna propia en encuestas_turisticas - ver reporteController.js).
  getTabulacion(filtros?: { feriado?: string; fechaInicio?: string; fechaFin?: string; anio?: number }): Observable<any> {
    return this.api.get<any>('reportes/tabulacion', filtros);
  }

  generarReporte(tipo: string, filtros: any): Observable<any> {
    return this.api.post<any>('reportes/generar', { tipo, filtros });
  }

  descargarReporte(id: number): Observable<Blob> {
    return this.api.getBlob(`reportes/${id}/descargar`);
  }

  getReporteById(id: number): Observable<any> {
    return this.api.get<any>(`reportes/${id}`);
  }
}