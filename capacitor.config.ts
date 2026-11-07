import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'ec.edu.upse.ots',
  appName: 'OTS Santa Elena',
  webDir: 'www',
  plugins: {
    // Live Updates auto-hospedado: la app NO usa el servidor de Capgo (autoUpdate off);
    // la actualización la controla UpdateService contra nuestro propio backend.
    CapacitorUpdater: {
      autoUpdate: false,
      resetWhenUpdate: true,
    },
  },
};

export default config;
