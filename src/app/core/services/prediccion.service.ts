import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';

// Todo pasa por el backend, que hace de proxy al microservicio de ML. Las predicciones NO se
// guardan: se retiró la función de "predicciones guardadas" (listar, validar, descartar), porque el
// modelo predice la ocupación del destino y nada escribía en esa tabla.
@Injectable({
  providedIn: 'root'
})
export class PrediccionService {
  constructor(private api: ApiService) {}

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

  // Estado y precisión del modelo ML EN USO (proxy del backend al microservicio): entrenado,
  // estado_modelo, modelo_usado, precision y fecha_entrenamiento.
  getMetricasModeloML(): Observable<any> {
    return this.api.get<any>('predicciones/ml/metricas');
  }
}
