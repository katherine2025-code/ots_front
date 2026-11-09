import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NavigationEnd, Router, RouterModule } from '@angular/router';
import { filter } from 'rxjs';
import { IonicModule } from '@ionic/angular';
import { Capacitor } from '@capacitor/core';
import { StatusBar, Style } from '@capacitor/status-bar';
import { SidebarComponent } from './shared/components/sidebar/sidebar.component';
import { ThemeService } from './core/services/theme.service';
import { UpdateService } from './core/services/update.service';

// Rutas públicas que no deben mostrar la barra lateral (usuario aún no autenticado)
const RUTAS_SIN_SIDEBAR = ['/login', '/registro'];

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
  standalone: true,
  imports: [CommonModule, RouterModule, IonicModule, SidebarComponent],
})
export class AppComponent implements OnInit {
  mostrarSidebar = !RUTAS_SIN_SIDEBAR.some(ruta => this.router.url.startsWith(ruta));

  constructor(private router: Router, public theme: ThemeService, private updates: UpdateService) { }

  ngOnInit() {
    this.theme.iniciar();

    // Que el contenido empiece DEBAJO de la barra de estado del teléfono (reloj/wifi/batería),
    // si no la barra azul queda tapada y el ☰ no se puede tocar bien.
    this.configurarStatusBar();

    // Live Updates: confirma el bundle actual y busca una versión web más nueva (solo en el APK).
    this.updates.notificarListo();
    this.updates.buscarActualizacion();

    this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe((event) => {
        const url = (event as NavigationEnd).urlAfterRedirects;
        this.mostrarSidebar = !RUTAS_SIN_SIDEBAR.some(ruta => url.startsWith(ruta));
      });
  }

  // Solo en el APK: la barra de estado deja de superponerse al contenido y toma el color
  // primario, con íconos claros. Así la barra azul de la app queda completa y clickeable.
  private async configurarStatusBar() {
    if (!Capacitor.isNativePlatform()) return;
    try {
      await StatusBar.setOverlaysWebView({ overlay: false });
      await StatusBar.setBackgroundColor({ color: '#2A6F97' });
      await StatusBar.setStyle({ style: Style.Dark }); // texto/íconos claros sobre azul
    } catch {
      /* en navegador o si el plugin no está, se ignora */
    }
  }
}
