import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AlertController, IonicModule, MenuController } from '@ionic/angular';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { Subscription } from 'rxjs';
import { AuthService } from 'src/app/core/services/auth.service';

// Roles: 0 Super Administrador, 1 Administrador, 2 Investigador, 3 Encuestador
interface ItemMenu {
  etiqueta: string;
  icono: string;
  ruta: string;
  ayuda: string;        // texto del tooltip: qué se hace en ese módulo
  roles: number[];
}

interface SeccionMenu {
  titulo?: string;
  items: ItemMenu[];
}

// Única fuente del menú: para agregar/mover un módulo basta con editar esta lista.
// Los roles replican los guards de app.routes.ts (el menú solo oculta; la seguridad está en los guards).
const MENU: SeccionMenu[] = [
  {
    items: [
      { etiqueta: 'Dashboard', icono: 'grid-outline', ruta: '/dashboard', ayuda: 'Resumen general del observatorio', roles: [0, 1, 2] },
      { etiqueta: 'Mis encuestas', icono: 'clipboard-outline', ruta: '/mis-encuestas', ayuda: 'Encuestas asignadas y tu avance en la jornada', roles: [3] }
    ]
  },
  {
    titulo: 'Análisis',
    items: [
      { etiqueta: 'Ocupación', icono: 'people-outline', ruta: '/ocupacion', ayuda: 'Ocupación por hotel y fecha', roles: [0, 1] },
      { etiqueta: 'Predicciones', icono: 'analytics-outline', ruta: '/predicciones', ayuda: 'Modelos de ML y proyecciones de ocupación', roles: [0, 1, 2] },
      { etiqueta: 'Reportes', icono: 'document-text-outline', ruta: '/reportes', ayuda: 'Estadísticas y tabulación de encuestas', roles: [0, 1, 2] }
    ]
  },
  {
    titulo: 'Recolección',
    items: [
      { etiqueta: 'Encuestas', icono: 'clipboard-outline', ruta: '/encuestas', ayuda: 'Cuestionarios y respuestas recolectadas', roles: [0, 1, 2] },
      { etiqueta: 'Cronograma', icono: 'calendar-outline', ruta: '/cronograma', ayuda: 'Jornadas de recolección y metas por encuestador', roles: [0, 1, 2] }
    ]
  },
  {
    titulo: 'Administración',
    items: [
      { etiqueta: 'Hoteles', icono: 'business-outline', ruta: '/hoteles', ayuda: 'Catastro de establecimientos de alojamiento', roles: [0, 1] },
      { etiqueta: 'Usuarios', icono: 'people-circle-outline', ruta: '/usuarios', ayuda: 'Cuentas, roles y accesos', roles: [0, 1] },
      { etiqueta: 'Carga ETL', icono: 'cloud-upload-outline', ruta: '/etl', ayuda: 'Importar archivos de datos (CSV / Excel)', roles: [0] }
    ]
  }
];

@Component({
  selector: 'app-sidebar',
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.scss'],
  standalone: true,
  imports: [CommonModule, IonicModule, RouterLink, RouterLinkActive]
})
export class SidebarComponent implements OnInit, OnDestroy {
  usuario: any = null;
  rolNombre = '';
  iniciales = '?';
  fotoPerfil = '';
  // Se calcula una vez por cambio de usuario (no en cada ciclo de detección de cambios)
  secciones: SeccionMenu[] = [];

  private sub?: Subscription;

  constructor(
    private authService: AuthService,
    private router: Router,
    private menuCtrl: MenuController,
    private alertCtrl: AlertController
  ) { }

  ngOnInit() {
    this.sub = this.authService.currentUser$.subscribe(user => {
      if (!user) return;

      this.usuario = user;
      this.rolNombre = this.authService.getRolNombre();
      const primera = (texto: unknown) => String(texto || '').trim().charAt(0).toUpperCase();
      this.iniciales = (primera(user.nombres) + primera(user.apellidos)) || '?';
      this.fotoPerfil = localStorage.getItem('foto_perfil') || '';

      this.secciones = MENU
        .map(s => ({ ...s, items: s.items.filter(i => i.roles.includes(user.id_rol)) }))
        .filter(s => s.items.length > 0);
    });
  }

  ngOnDestroy() {
    this.sub?.unsubscribe();
  }

  trackPorRuta(_: number, item: ItemMenu): string {
    return item.ruta;
  }

  onImageError() {
    this.fotoPerfil = '';
  }

  onLogoError(event: Event) {
    (event.target as HTMLElement).style.display = 'none';
  }

  async logout() {
    await this.menuCtrl.close();
    const alerta = await this.alertCtrl.create({
      header: 'Cerrar sesión',
      message: '¿Seguro que deseas salir? Tendrás que volver a iniciar sesión.',
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Cerrar sesión',
          role: 'destructive',
          handler: () => {
            this.authService.logout();
            this.router.navigate(['/login']);
          }
        }
      ]
    });
    await alerta.present();
  }
}
