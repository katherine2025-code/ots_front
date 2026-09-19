import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NavigationEnd, Router, RouterModule } from '@angular/router';
import { filter } from 'rxjs';
import { IonApp, IonRouterOutlet } from '@ionic/angular/standalone';
import { SidebarComponent } from './shared/components/sidebar/sidebar.component';
import { ThemeService } from './core/services/theme.service';

// Rutas públicas que no deben mostrar la barra lateral (usuario aún no autenticado)
const RUTAS_SIN_SIDEBAR = ['/login', '/registro'];

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
  standalone: true,
  imports: [CommonModule, RouterModule, IonApp, IonRouterOutlet, SidebarComponent],
})
export class AppComponent implements OnInit {
  mostrarSidebar = !RUTAS_SIN_SIDEBAR.some(ruta => this.router.url.startsWith(ruta));

  constructor(private router: Router, public theme: ThemeService) { }

  ngOnInit() {
    this.theme.iniciar();

    this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe((event) => {
        const url = (event as NavigationEnd).urlAfterRedirects;
        this.mostrarSidebar = !RUTAS_SIN_SIDEBAR.some(ruta => url.startsWith(ruta));
      });
  }
}
