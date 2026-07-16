import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class EtlService {
  // Backend Node.js (puerto 3000) - Requiere token JWT
  private backendUrl = 'http://localhost:3000/api/etl';
  
  // Microservicio Python ML (puerto 5000) - NO requiere token
  private mlServiceUrl = 'http://localhost:5000';

  constructor(private http: HttpClient) {}

  // ==========================================
  // 📡 MÉTODOS PARA BACKEND NODE.JS (ETL)
  // ==========================================
  // NOTA: El token JWT se agrega automáticamente por el authInterceptor
  // NO necesitas agregar headers manualmente aquí

  /**
   * Cargar archivo CSV al backend Node.js
   * POST /api/etl/cargar
   */
  cargarArchivo(file: File, tipo: string): Observable<any> {
    const formData = new FormData();
    formData.append('archivo', file);
    formData.append('tipo', tipo);

    console.log(' [ETL] Subiendo archivo:', file.name, 'tipo:', tipo);

    return this.http.post(`${this.backendUrl}/cargar`, formData, {
      reportProgress: true,
      observe: 'events'
    });
  }

  /**
   * Obtener historial de procesos ETL
   * GET /api/etl/historial
   */
  getHistorial(pagina: number = 1, limite: number = 20, tipo?: string, estado?: string): Observable<any> {
    let params = `?pagina=${pagina}&limite=${limite}`;
    if (tipo) params += `&tipo=${tipo}`;
    if (estado) params += `&estado=${estado}`;
    
    return this.http.get(`${this.backendUrl}/historial${params}`);
  }

  /**
   * Obtener estado de procesos activos
   * GET /api/etl/estado
   */
  getEstadoProcesos(): Observable<any> {
    return this.http.get(`${this.backendUrl}/estado`);
  }

  /**
   * Obtener estadísticas de datos cargados
   * GET /api/etl/estadisticas
   */
  getEstadisticasDatos(): Observable<any> {
    return this.http.get(`${this.backendUrl}/estadisticas`);
  }

  /**
   * Obtener tipos de datos disponibles
   * GET /api/etl/tipos-datos
   */
  getTiposDatos(): Observable<any> {
    return this.http.get(`${this.backendUrl}/tipos-datos`);
  }

  /**
   * Programar ejecución ETL
   * POST /api/etl/programar
   */
  programarEjecucion(data: any): Observable<any> {
    return this.http.post(`${this.backendUrl}/programar`, data);
  }

  /**
   * Obtener ejecuciones programadas
   * GET /api/etl/programadas
   */
  getEjecucionesProgramadas(): Observable<any> {
    return this.http.get(`${this.backendUrl}/programadas`);
  }

  /**
   * Cancelar ejecución programada
   * DELETE /api/etl/programadas/:id
   */
  cancelarEjecucion(id: number): Observable<any> {
    return this.http.delete(`${this.backendUrl}/programadas/${id}`);
  }

  /**
   * Obtener logs de errores
   * GET /api/etl/logs
   */
  getLogsErrores(limite: number = 50): Observable<any> {
    return this.http.get(`${this.backendUrl}/logs?limite=${limite}`);
  }

  /**
   * Eliminar registro del historial
   * DELETE /api/etl/historial/:id
   */
  eliminarRegistro(id: number): Observable<any> {
    return this.http.delete(`${this.backendUrl}/historial/${id}`);
  }

  /**
   * Reintentar proceso fallido
   * POST /api/etl/historial/:id/reintentar
   */
  reintentarProceso(id: number): Observable<any> {
    return this.http.post(`${this.backendUrl}/historial/${id}/reintentar`, {});
  }

  /**
   * Obtener progreso de carga
   * GET /api/etl/progreso/:id
   */
  getProgresoCarga(id: number): Observable<any> {
    return this.http.get(`${this.backendUrl}/progreso/${id}`);
  }

   getProcesoDetalle(id: number): Observable<any> {
    return this.http.get(`${this.backendUrl}/detalles/${id}`); // ✅ CORREGIDO a backendUrl
  }

  // ==========================================
  // MÉTODOS PARA MICROSERVICIO PYTHON (ML)
  // ==========================================
  // NOTA: El microservicio Python NO usa JWT, por eso mantenemos headers manuales

  /**
   * Entrenar el modelo ML
   * POST http://localhost:5000/entrenar
   */
  entrenarModelo(): Observable<any> {
    return this.http.post(`${this.mlServiceUrl}/entrenar`, {}, {
      headers: new HttpHeaders({ 'Content-Type': 'application/json' })
    });
  }

  /**
   * Realizar una predicción de ocupación
   * POST http://localhost:5000/predecir
   */
  predecir(datos: {
    fecha_objetivo: string;
    checkin_nacionales?: number;
    checkin_extranjeros?: number;
    tarifa_cobrada?: number;
    temperatura?: number;
    humedad?: number;
    precipitacion?: number;
    total_dias?: number;
    temporada?: string;
  }): Observable<any> {
    return this.http.post(`${this.mlServiceUrl}/predecir`, datos, {
      headers: new HttpHeaders({ 'Content-Type': 'application/json' })
    });
  }

  /**
   * Obtener métricas del modelo entrenado
   * GET http://localhost:5000/metricas
   */
  obtenerMetricasModelo(): Observable<any> {
    return this.http.get(`${this.mlServiceUrl}/metricas`, {
      headers: new HttpHeaders({ 'Content-Type': 'application/json' })
    });
  }

  /**
   * Verificar estado del microservicio ML
   * GET http://localhost:5000/
   */
  verificarEstadoML(): Observable<any> {
    return this.http.get(`${this.mlServiceUrl}/`, {
      headers: new HttpHeaders({ 'Content-Type': 'application/json' })
    });
  }
}