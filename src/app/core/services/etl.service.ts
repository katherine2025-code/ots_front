import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class EtlService {
  private apiUrl = 'http://localhost:3000/api/etl';
  private mlUrl = 'http://localhost:5000'; // Microservicio Python

  constructor(private http: HttpClient) {}

  // ==========================================
  // MÉTODOS ETL (Node.js Backend) - ORIGINALES
  // ==========================================

  getTiposDatos(): Observable<any> {
    return this.http.get(`${this.apiUrl}/tipos-datos`);
  }

  getHistorial(page: number = 1, limit: number = 20, filtro: string = ''): Observable<any> {
    return this.http.get(`${this.apiUrl}/historial?page=${page}&limit=${limit}&filtro=${filtro}`);
  }

  getProcesoDetalle(id: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/detalles/${id}`);
  }

  getEstadisticasDatos(): Observable<any> {
    return this.http.get(`${this.apiUrl}/estadisticas`);
  }

  getEstadoProcesos(): Observable<any> {
    return this.http.get(`${this.apiUrl}/estado-procesos`);
  }

  getLogsErrores(limit: number = 10): Observable<any> {
    return this.http.get(`${this.apiUrl}/logs-errores?limit=${limit}`);
  }

  getEjecucionesProgramadas(): Observable<any> {
    return this.http.get(`${this.apiUrl}/ejecuciones-programadas`);
  }

  // Agregar al final de la clase
  getHistoricalPredictions(): Observable<any> {
  return this.http.get(`${this.mlUrl}/predicciones-historicas`);
}

  cargarArchivo(file: File, tipo: string): Observable<any> {
    const formData = new FormData();
    formData.append('archivo', file);
    formData.append('tipo', tipo);
    return this.http.post(`${this.apiUrl}/procesar`, formData);
  }

  eliminarRegistro(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/registro/${id}`);
  }

  reintentarProceso(id: number): Observable<any> {
    return this.http.post(`${this.apiUrl}/reintentar/${id}`, {});
  }

  cancelarEjecucion(id: number): Observable<any> {
    return this.http.post(`${this.apiUrl}/cancelar/${id}`, {});
  }

  procesarCSV(file: File, tipo: string): Observable<any> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('tipo', tipo);
    return this.http.post(`${this.apiUrl}/procesar`, formData);
  }

  obtenerHistorial(): Observable<any> {
    return this.http.get(`${this.apiUrl}/historial`);
  }

  obtenerDetalles(id: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/detalles/${id}`);
  }

  // ==========================================
  // MÉTODOS ML (Microservicio Python) - NUEVOS
  // ==========================================

  entrenarModelo(): Observable<any> {
    return this.http.post(`${this.mlUrl}/entrenar`, {});
  }

  predecirOcupacion(datos: any): Observable<any> {
    return this.http.post(`${this.mlUrl}/predecir`, datos);
  }

  getMetricas(): Observable<any> {
    return this.http.get(`${this.mlUrl}/metricas`);
  }
}