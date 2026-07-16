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