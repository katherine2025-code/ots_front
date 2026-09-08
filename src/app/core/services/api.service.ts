import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { StorageService } from './storage.service';

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private baseUrl = 'http://localhost:3000/api';

  constructor(
    private http: HttpClient,
    private storage: StorageService
  ) { }

  // ==========================================
  // HEADERS
  // ==========================================

  private getHeaders(): HttpHeaders {
    let headers = new HttpHeaders({
      'Content-Type': 'application/json'
    });

    const token = this.storage.get('token');
    if (token) {
      headers = headers.set('Authorization', `Bearer ${token}`);
    }

    return headers;
  }

  // ==========================================
  // GET
  // ==========================================

  get<T>(endpoint: string, params?: any): Observable<T> {
    let httpParams = new HttpParams();
    if (params) {
      Object.keys(params).forEach(key => {
        if (params[key] !== null && params[key] !== undefined) {
          httpParams = httpParams.set(key, params[key]);
        }
      });
    }

    console.log(`[API] GET: ${this.baseUrl}/${endpoint}`);

    return this.http.get<T>(`${this.baseUrl}/${endpoint}`, {
      headers: this.getHeaders(),
      params: httpParams
    }).pipe(
      catchError(this.handleError)
    );
  }

  // ==========================================
  // GET BLOB (para descargar archivos)
  // ==========================================

  getBlob(endpoint: string, params?: any): Observable<Blob> {
    let httpParams = new HttpParams();
    if (params) {
      Object.keys(params).forEach(key => {
        if (params[key] !== null && params[key] !== undefined) {
          httpParams = httpParams.set(key, params[key]);
        }
      });
    }

    console.log(`[API] GET Blob: ${this.baseUrl}/${endpoint}`);

    return this.http.get(`${this.baseUrl}/${endpoint}`, {
      headers: this.getHeaders(),
      params: httpParams,
      responseType: 'blob'
    }).pipe(
      catchError(this.handleError)
    );
  }

  // ==========================================
  // POST
  // ==========================================

  post<T>(endpoint: string, body: any): Observable<T> {
    console.log(`[API] POST: ${this.baseUrl}/${endpoint}`, body);

    return this.http.post<T>(`${this.baseUrl}/${endpoint}`, body, {
      headers: this.getHeaders()
    }).pipe(
      catchError(this.handleError)
    );
  }

  // ==========================================
  // PUT
  // ==========================================

  put<T>(endpoint: string, body: any): Observable<T> {
    console.log(`[API] PUT: ${this.baseUrl}/${endpoint}`, body);

    return this.http.put<T>(`${this.baseUrl}/${endpoint}`, body, {
      headers: this.getHeaders()
    }).pipe(
      catchError(this.handleError)
    );
  }

  // ==========================================
  // PATCH (agregado para compatibilidad)
  // ==========================================

  patch<T>(endpoint: string, body: any): Observable<T> {
    console.log(`[API] PATCH: ${this.baseUrl}/${endpoint}`, body);

    return this.http.patch<T>(`${this.baseUrl}/${endpoint}`, body, {
      headers: this.getHeaders()
    }).pipe(
      catchError(this.handleError)
    );
  }

  // ==========================================
  // DELETE
  // ==========================================

  delete<T>(endpoint: string): Observable<T> {
    console.log(`[API] DELETE: ${this.baseUrl}/${endpoint}`);

    return this.http.delete<T>(`${this.baseUrl}/${endpoint}`, {
      headers: this.getHeaders()
    }).pipe(
      catchError(this.handleError)
    );
  }

  // ==========================================
  // MANEJO DE ERRORES MEJORADO
  // ==========================================

  private handleError(error: HttpErrorResponse) {
    console.error('[API] Error:', error);

    let errorMessage = 'Error desconocido';

    if (error.error instanceof ErrorEvent) {
      // Error del lado del cliente
      errorMessage = `Error: ${error.error.message}`;
    } else {
      // Error del lado del servidor
      if (error.status === 0) {
        errorMessage = 'No se puede conectar con el servidor. Verifica que el backend esté corriendo.';
      } else if (error.status === 401) {
        const errorDetail = error.error?.error || error.error?.message || '';

        if (errorDetail.includes('credenciales') ||
          errorDetail.includes('contraseña') ||
          errorDetail.includes('correo') ||
          errorDetail.includes('inválido')) {
          errorMessage = errorDetail;
        } else {
          errorMessage = 'Credenciales incorrectas. Verifica tu correo y contraseña.';
        }
      } else if (error.status === 403) {
        errorMessage = 'No tienes permisos para realizar esta acción.';
      } else if (error.status === 404) {
        errorMessage = 'Recurso no encontrado.';
      } else if (error.status === 409) {
        errorMessage = error.error?.message || 'Conflicto: El recurso ya existe.';
      } else if (error.status === 422) {
        errorMessage = error.error?.message || 'Error de validación. Verifica los datos ingresados.';
      } else if (error.status === 500) {
        errorMessage = error.error?.error || 'Error interno del servidor.';
      } else {
        errorMessage = error.error?.message || error.error?.error || 'Error en la petición';
      }
    }

    console.error(`[API] Status: ${error.status}, Mensaje: ${errorMessage}`);

    return throwError(() => new Error(errorMessage));
  }
}