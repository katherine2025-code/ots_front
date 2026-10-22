import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Capacitor } from '@capacitor/core';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root'
})
export class EtlService {
  // Ver api.service.ts: dentro de la app nativa 'localhost' apunta al propio celular, no al servidor.
  private apiUrl = `${Capacitor.isNativePlatform() ? environment.apiUrlNative : environment.apiUrl}/etl`;
  // El microservicio Python no se llama nunca desde el navegador (no es público y exige un token
  // de servicio): el backend hace de proxy en /api/predicciones/ml/* (ver prediccionRoutes.js).
  private mlProxyUrl = `${Capacitor.isNativePlatform() ? environment.apiUrlNative : environment.apiUrl}/predicciones/ml`;

  constructor(private http: HttpClient) { }

  // ==========================================
  // MÉTODOS ETL (Node.js Backend)
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

  getHistoricalPredictions(limite?: number, dias?: number): Observable<any> {
    let params = new HttpParams();

    if (limite) {
      params = params.set('limite', limite.toString());
    }
    if (dias) {
      params = params.set('dias', dias.toString());
    }

    return this.http.get(`${this.mlProxyUrl}/historicas`, { params });
  }

  cargarArchivo(file: File, tipo: string): Observable<any> {
    const formData = new FormData();
    formData.append('archivo', file);
    formData.append('tipo', tipo);
    // reportProgress + observe:'events' son obligatorios para que etl.page.ts
    // reciba HttpEventType.UploadProgress/Response - sin esto, isUploading
    // nunca vuelve a false porque event.type siempre es undefined.
    return this.http.post(`${this.apiUrl}/procesar`, formData, {
      reportProgress: true,
      observe: 'events'
    });
  }

  eliminarRegistro(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/registro/${id}`);
  }

  reintentarProceso(id: number): Observable<any> {
    return this.http.post(`${this.apiUrl}/reintentar/${id}`, {});
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

  // MÉTODOS ML (vía proxy del backend; entrenar y predecir están en prediccion.service.ts)

  getMetricas(): Observable<any> {
    return this.http.get(`${this.mlProxyUrl}/metricas`);
  }
}