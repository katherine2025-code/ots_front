import { HttpInterceptorFn } from '@angular/common/http';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  // StorageService usa el prefijo 'ots_' → la clave real es 'ots_token'
  const raw = localStorage.getItem('ots_token');
  const token = raw ? raw.replace(/['"]+/g, '') : null;

  if (token) {
    const authReq = req.clone({
      setHeaders: { Authorization: `Bearer ${token}` }
    });
    return next(authReq);
  }

  return next(req);
};
