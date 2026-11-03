import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';

// Si el backend rechaza el token (caducado o inválido) se cierra la sesión y se vuelve al login.
// Se limpia el almacenamiento directamente: inyectar AuthService aquí crearía una dependencia
// circular (AuthService -> ApiService -> HttpClient -> este interceptor).
function cerrarSesionPorTokenInvalido(router: Router): void {
  ['ots_token', 'ots_usuario', 'token', 'usuario'].forEach(k => localStorage.removeItem(k));
  if (!router.url.startsWith('/login')) {
    router.navigate(['/login']);
  }
}

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);
  // Intentar obtener de localStorage primero
  let token = localStorage.getItem('token');
  
  console.log('[Interceptor] Token:', token ? 'SÍ existe' : 'NO existe');
  console.log('[Interceptor] URL:', req.url);
  
  if (!token) {
    // Ionic Storage guarda en localStorage con prefijo
    const ionicStorage = JSON.parse(localStorage.getItem('_ionic/storage') || '{}');
    token = ionicStorage?.token || null;
  }
  
  console.log('[Interceptor] Token:', token ? 'SÍ existe' : 'NO existe');
  console.log('[Interceptor] URL:', req.url);
  
  // Si hay token, agregarlo al header
  if (token) {
    // Limpiar el token (quitar comillas si las tiene)
    const cleanToken = token.replace(/['"]+/g, '');
    
    // Clonar la petición y agregar el header
    const authReq = req.clone({
      setHeaders: {
        Authorization: `Bearer ${cleanToken}`
      }
    });
    
    console.log('[Interceptor] Token agregado a la petición');
    return next(authReq).pipe(
      catchError((error: HttpErrorResponse) => {
        // authMiddleware del backend responde 403 "Token inválido o expirado" cuando el token
        // ya no sirve (otros 403 son falta de permisos por rol y NO cierran sesión). El 401 del
        // propio login significa "credenciales incorrectas", no sesión caducada.
        const tokenRechazado =
          (error.status === 401 && !req.url.includes('auth/login')) ||
          (error.status === 403 && /token/i.test(error.error?.error || ''));
        if (tokenRechazado) {
          cerrarSesionPorTokenInvalido(router);
        }
        return throwError(() => error);
      })
    );
  }
  
  console.log('[Interceptor] Sin token, petición sin autenticación');
  return next(req);
};