import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { noAuthGuard } from './core/guards/no-auth.guard';
import { adminGuard, adminOInvestigadorGuard, encuestadorGuard } from './core/guards/rol.guard';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'login',
    pathMatch: 'full'
  },
  {
    path: 'login',
    loadComponent: () => import('./pages/login/login.page').then(m => m.LoginPage),
    canActivate: [noAuthGuard]
  },
  {
    path: 'registro',
    loadComponent: () => import('./pages/registro/registro.page').then(m => m.RegistroPage),
    canActivate: [noAuthGuard]
  },
  {
    path: 'dashboard',
    loadComponent: () => import('./pages/dashboard/dashboard.page').then(m => m.DashboardPage),
    canActivate: [authGuard, adminOInvestigadorGuard]
  },
  {
    path: 'mis-encuestas',
    loadComponent: () => import('./pages/mis-encuestas/mis-encuestas.page').then(m => m.MisEncuestasPage),
    canActivate: [encuestadorGuard]
  },
  {
    path: 'cronograma',
    loadComponent: () => import('./pages/cronograma/cronograma.page').then(m => m.CronogramaPage),
    canActivate: [authGuard, adminOInvestigadorGuard]  // Admin controla; Investigador solo lectura
  },
  {
    path: 'hoteles',
    loadComponent: () => import('./pages/hoteles/lista/hoteles-lista.page').then(m => m.HotelesListaPage),
    canActivate: [authGuard]
  },
  {
    path: 'hoteles/:id',
    loadComponent: () => import('./pages/hoteles/detalle/hotel-detalle.page').then(m => m.HotelDetallePage),
    canActivate: [authGuard]
  },
  {
    path: 'predicciones',
    loadComponent: () => import('./pages/predicciones/predicciones.page').then(m => m.PrediccionesPage),
    canActivate: [authGuard]
  },
  {
    path: 'reportes',
    loadComponent: () => import('./pages/reportes/reportes.page').then(m => m.ReportesPage),
    canActivate: [authGuard, adminOInvestigadorGuard]
  },
  {
    path: 'ocupacion',
    loadComponent: () => import('./pages/ocupacion/ocupacion.page').then(m => m.OcupacionPage),
    canActivate: [authGuard]
  },
  {
    path: 'perfil',
    loadComponent: () => import('./pages/perfil/perfil.page').then(m => m.PerfilPage),
    canActivate: [authGuard]
  },
  // ✅ RUTA DE USUARIOS - AGREGADA
  {
    path: 'usuarios',
    loadComponent: () => import('./pages/usuarios/usuarios.page').then(m => m.UsuariosPage),
    canActivate: [authGuard, adminGuard]  // Solo admin puede acceder
  },
  {
    path: 'etl',
    loadComponent: () => import('./pages/etl/etl.page').then(m => m.EtlPage),
    canActivate: [adminGuard]
  },
  {
    path: 'etl/detalles/:id',
    loadComponent: () => import('./pages/etl-detalles/etl-detalles.page').then(m => m.EtlDetallesPage)
  },
  {
    path: 'reporte-detalle/:id',
    loadComponent: () => import('./pages/reporte-detalles/reporte-detalles.page').then(m => m.ReporteDetallePage)
  },

  // ==========================================
  // RUTAS DE ENCUESTAS
  // ==========================================
  {
    path: 'encuestas',
    loadComponent: () => import('./pages/encuestas/encuestas.page').then(m => m.EncuestasPage),
    canActivate: [authGuard]
  },
  {
    path: 'encuestas/detalle/:id',
    loadComponent: () => import('./pages/encuestas-detalle/encuestas-detalle.page').then(m => m.EncuestasDetallePage),
    canActivate: [authGuard]
  },
  {
    path: 'encuestas/editar/:id',
    loadComponent: () => import('./pages/encuestas-editar/encuestas-editar.page').then(m => m.EncuestasEditarPage),
    canActivate: [adminGuard]  // Solo super_admin y admin pueden editar preguntas/respuestas
  },
  {
    path: 'responder-encuesta/:tipo',
    loadComponent: () => import('./pages/responder-encuesta/responder-encuesta.page').then(m => m.ResponderEncuestaPage),
    canActivate: [encuestadorGuard]
  },

  // Ruta comodín al final - redirige a dashboard
  {
    path: '**',
    redirectTo: 'dashboard'
  }
];