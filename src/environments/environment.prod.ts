export const environment = {
  production: true,
  // Front y backend están desplegados como apps separadas en Dokploy, cada una con su propio
  // dominio (no comparten origen), así que aquí va la URL completa del backend - no sirve una
  // ruta relativa como '/api'. Si el dominio del backend cambia (por ejemplo al recrear la app
  // en Dokploy), hay que actualizarlo aquí y volver a compilar.
  apiUrl: 'https://ots-backend.serverteced.cloud/api',
  // El APK se compila con este archivo (ng build --configuration production). Ahora el backend tiene
  // dominio público, así que la app nativa apunta al mismo dominio (ya no a la IP de la red local).
  apiUrlNative: 'https://ots-backend.serverteced.cloud/api',
  version: '1.0.0',
  debug: false,
  enableCors: false
};