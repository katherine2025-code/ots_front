import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { noAuthGuard } from './core/guards/no-auth.guard';
import { adminGuard } from './core/guards/rol.guard';

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
    canActivate: [authGuard]
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
    canActivate: [authGuard]
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
  // ✅ RUTAS DE ENCUESTAS - CORREGIDAS
  // ==========================================
  {
    path: 'encuestas',
    loadComponent: () => import('./pages/encuestas/encuestas.page').then(m => m.EncuestasPage)
  },
  {
    path: 'encuestas/nueva',
    loadComponent: () => import('./pages/encuestas-nuevas/encuestas-nuevas.page').then(m => m.EncuestasNuevaPage)
  },
  {
    path: 'encuestas/detalle/:id',
    loadComponent: () => import('./pages/encuestas-detalle/encuestas-detalle.page').then(m => m.EncuestasDetallePage)
  },
  {
    path: 'encuestas/editar/:id',
    loadComponent: () => import('./pages/encuestas-editar/encuestas-editar.page').then(m => m.EncuestasEditarPage)
  },
  {
    path: 'encuestas/editor',
    loadComponent: () => import('./pages/encuestas-editor/encuestas-editor.page').then(m => m.EncuestasEditorPage)
  },
  {
  path: 'responder-encuesta/:tipo',
  loadComponent: () => import('./pages/responder-encuesta/responder-encuesta.page').then(m => m.ResponderEncuestaPage),
  canActivate:[authGuard]
},

{
  path: 'perfil',
  loadComponent: () => import('./pages/perfil/perfil.page').then(m => m.PerfilPage)
},
  
  // Ruta comodín al final
  {
    path: '**',
    redirectTo: 'dashboard'
  },
  
];