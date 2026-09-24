export const environment = {
  production: true,
  apiUrl: '/api',  // En producción (web), la URL relativa: la app y la API se sirven del mismo dominio
  // El APK se compila con este archivo (ng build --configuration production). Mientras no haya un
  // backend con dominio público, apunta a la IP local de la máquina que corre el backend (ver
  // environment.ts para más detalle) - cambiar aquí también si esa IP cambia.
  apiUrlNative: 'http://192.168.110.193:3000/api',
  version: '1.0.0',
  debug: false,
  enableCors: false
};