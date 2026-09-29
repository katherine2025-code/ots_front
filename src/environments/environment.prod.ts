export const environment = {
  production: true,
  // Front y backend están desplegados como apps separadas en Dokploy, cada una con su propio
  // dominio (no comparten origen), así que aquí va la URL completa del backend - no sirve una
  // ruta relativa como '/api'. Si el dominio del backend cambia (por ejemplo al recrear la app
  // en Dokploy), hay que actualizarlo aquí y volver a compilar.
  apiUrl: 'http://turismo-api-ykoq9w-6c1034-72-61-11-127.sslip.io/api',
  // El APK se compila con este archivo (ng build --configuration production). Mientras no haya un
  // backend con dominio público, apunta a la IP local de la máquina que corre el backend (ver
  // environment.ts para más detalle) - cambiar aquí también si esa IP cambia.
  apiUrlNative: 'http://192.168.110.193:3000/api',
  version: '1.0.0',
  debug: false,
  enableCors: false
};