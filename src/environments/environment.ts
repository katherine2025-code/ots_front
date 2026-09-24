// This file can be replaced during build by using the `fileReplacements` array.
// `ng build` replaces `environment.ts` with `environment.prod.ts`.
// The list of file replacements can be found in `angular.json`.

import { Version } from "@angular/core";

export const environment = {
  production: false,
  apiUrl: 'http://localhost:3000/api',
  // Usada solo dentro de la app nativa (APK/Capacitor): ahí 'localhost' sería el propio celular,
  // así que se necesita la IP de la máquina que corre el backend en la red local. Cambia esto si
  // la IP de esa máquina cambia (revisar con `ipconfig`) o si el backend pasa a tener un dominio
  // público. El celular debe estar en la MISMA red WiFi que esta máquina.
  apiUrlNative: 'http://192.168.110.193:3000/api',
  version: '1.0.0',
  // Para desarrollo
  debug: true,
  enableCors: true
};

/*
 * For easier debugging in development mode, you can import the following file
 * to ignore zone related error stack frames such as `zone.run`, `zoneDelegate.invokeTask`.
 *
 * This import should be commented out in production mode because it will have a negative impact
 * on performance if an error is thrown.
 */
// import 'zone.js/plugins/zone-error';  // Included with Angular CLI.
