import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { StorageService } from '../services/storage.service';

// Si el backend rechaza el token (caducado o inválido) se cierra la sesión y se vuelve al login.
// Se limpia el almacenamiento directamente: inyectar AuthService aquí crearía una dependencia
// circular (AuthService -> ApiService -> HttpClient -> este interceptor).
function cerrarSesionPorTokenInvalido(router: Router, storage: StorageService): void {
  storage.remove('token');
  storage.remove('usuario');
  if (!router.url.startsWith('/login')) {
    router.navigate(['/login']);
  }
}

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);
  const storage = inject(StorageService);
  // Única fuente del token: StorageService (clave "ots_token"), la misma que usa AuthService
  const token = storage.get('token');

  if (token) {
    const authReq = req.clone({ setHeaders: { Authorization: `Bearer ${token}` } });

    return next(authReq).pipe(
      catchError((error: HttpErrorResponse) => {
        // authMiddleware del backend responde 403 "Token inválido o expirado" cuando el token
        // ya no sirve (otros 403 son falta de permisos por rol y NO cierran sesión). El 401 del
        // propio login significa "credenciales incorrectas", no sesión caducada.
        const tokenRechazado =
          (error.status === 401 && !req.url.includes('auth/login')) ||
          (error.status === 403 && /token/i.test(error.error?.error || ''));
        if (tokenRechazado) {
          cerrarSesionPorTokenInvalido(router, storage);
        }
        return throwError(() => error);
      })
    );
  }
  
  return next(req);
};