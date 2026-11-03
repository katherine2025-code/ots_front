import { Injectable } from '@angular/core';
import { HttpClient, HttpParams, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { Capacitor } from '@capacitor/core';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  // Dentro de la app nativa (APK) no hay "mismo origen" que servir: 'localhost' apuntaría al
  // propio celular, no al servidor. Ahí se usa siempre una URL absoluta (environment.apiUrlNative);
  // en el navegador se usa environment.apiUrl (relativa en producción, localhost en desarrollo).
  private baseUrl = Capacitor.isNativePlatform() ? environment.apiUrlNative : environment.apiUrl;

  constructor(private http: HttpClient) { }

  // El token lo agrega auth.interceptor a TODAS las peticiones (también a las de etl.service, que usa
  // HttpClient directo); aquí no se repite. Content-Type tampoco: HttpClient lo pone según el cuerpo
  // (JSON para objetos, multipart para FormData).

  // Quita null/undefined: así un filtro vacío no viaja como "?feriado=undefined"
  private params(params?: Record<string, any>): HttpParams {
    let httpParams = new HttpParams();
    Object.entries(params || {}).forEach(([key, value]) => {
      if (value !== null && value !== undefined) {
        httpParams = httpParams.set(key, value);
      }
    });
    return httpParams;
  }

  get<T>(endpoint: string, params?: Record<string, any>): Observable<T> {
    return this.http.get<T>(`${this.baseUrl}/${endpoint}`, { params: this.params(params) })
      .pipe(catchError(this.handleError));
  }

  // Para descargar archivos
  getBlob(endpoint: string, params?: Record<string, any>): Observable<Blob> {
    return this.http.get(`${this.baseUrl}/${endpoint}`, { params: this.params(params), responseType: 'blob' })
      .pipe(catchError(this.handleError));
  }

  post<T>(endpoint: string, body: any): Observable<T> {
    return this.http.post<T>(`${this.baseUrl}/${endpoint}`, body).pipe(catchError(this.handleError));
  }

  put<T>(endpoint: string, body: any): Observable<T> {
    return this.http.put<T>(`${this.baseUrl}/${endpoint}`, body).pipe(catchError(this.handleError));
  }

  patch<T>(endpoint: string, body: any): Observable<T> {
    return this.http.patch<T>(`${this.baseUrl}/${endpoint}`, body).pipe(catchError(this.handleError));
  }

  delete<T>(endpoint: string): Observable<T> {
    return this.http.delete<T>(`${this.baseUrl}/${endpoint}`).pipe(catchError(this.handleError));
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
        // Se conserva el motivo específico que mande el backend (ej. "Solo un
        // Super Administrador puede...") en vez de un mensaje genérico que lo
        // descarta - importante para que las reglas de rol se entiendan.
        errorMessage = error.error?.error || error.error?.message || 'No tienes permisos para realizar esta acción.';
      } else if (error.status === 404) {
        // Se respeta el motivo específico del backend (ej. "No existe una cuenta
        // registrada con ese correo.") en lugar de un genérico que lo descarta.
        errorMessage = error.error?.error || error.error?.message || 'Recurso no encontrado.';
      } else if (error.status === 409) {
        errorMessage = error.error?.message || 'Conflicto: El recurso ya existe.';
      } else if (error.status === 422) {
        errorMessage = error.error?.message || 'Error de validación. Verifica los datos ingresados.';
      } else if (error.status === 500) {
        errorMessage = error.error?.error || 'Error interno del servidor.';
      } else if (Array.isArray(error.error?.detalles) && error.error.detalles.length > 0) {
        // Validadores del backend: { error: 'Errores de validación', detalles: [...] }
        errorMessage = error.error.detalles.join('. ');
      } else {
        errorMessage = error.error?.message || error.error?.error || 'Error en la petición';
      }
    }

    console.error(`[API] Status: ${error.status}, Mensaje: ${errorMessage}`);

    // Se conserva el status HTTP para que quien llama distinga errores de conexión/servidor (0, 5xx)
    const apiError: Error & { status?: number } = new Error(errorMessage);
    apiError.status = error.status;
    return throwError(() => apiError);
  }
}