import { HttpInterceptorFn } from '@angular/common/http';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
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
    return next(authReq);
  }
  
  console.log('[Interceptor] Sin token, petición sin autenticación');
  return next(req);
};