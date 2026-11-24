/*
 * Service worker mínimo de OTS.
 *
 * Su ÚNICA función es cumplir el requisito que exige el navegador para poder
 * "Instalar la aplicación" (PWA): una app instalable necesita un service worker
 * registrado con un manejador de 'fetch'.
 *
 * A propósito NO guarda nada en caché: cada petición va directo a la red. Así la
 * app instalada muestra SIEMPRE exactamente lo que hay en producción y nunca
 * queda desactualizada (es lo contrario de un cache que "congela" la versión).
 */
self.addEventListener('install', () => {
  // Activar de inmediato la versión nueva del service worker.
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  // Tomar control de las pestañas abiertas sin esperar a recargar.
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  // Passthrough: siempre a la red, sin caché.
  event.respondWith(fetch(event.request));
});
