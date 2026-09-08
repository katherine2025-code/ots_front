import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule, MenuController } from '@ionic/angular';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from 'src/app/core/services/auth.service';

@Component({
  selector: 'app-sidebar',
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.scss'],
  standalone: true,
  imports: [CommonModule, IonicModule, RouterLink]
})
export class SidebarComponent implements OnInit {
  usuario: any = null;
  rolNombre: string = '';
  isAdmin: boolean = false;
  isInvestigador: boolean = false;
  fotoPerfil: string = '';
  fotoCargada: boolean = false;

  constructor(
    private authService: AuthService,
    private router: Router,
    private menuCtrl: MenuController
  ) { }

  ngOnInit() {
    this.authService.currentUser$.subscribe(user => {
      if (!user) return;

      this.usuario = user;
      this.rolNombre = this.authService.getRolNombre();
      this.isAdmin = this.authService.isAdmin() || user.id_rol === 1;
      this.isInvestigador = this.authService.isInvestigador?.() || user.id_rol === 2 || false;

      this.cargarFotoPerfil();
    });
  }

  cargarFotoPerfil() {
    const fotoGuardada = localStorage.getItem('foto_perfil');
    if (fotoGuardada) {
      this.fotoPerfil = fotoGuardada;
      this.fotoCargada = true;
    } else {
      this.fotoPerfil = '';
      this.fotoCargada = false;
    }
  }

  isActive(ruta: string): boolean {
    return this.router.url === ruta || this.router.url.startsWith(ruta + '/');
  }

  onImageError(event: any) {
    if (!this.fotoCargada) {
      return;
    }
    console.log('[Sidebar] Error al cargar imagen de perfil');
    this.fotoCargada = false;
    this.fotoPerfil = '';
    event.target.style.display = 'none';
  }

  onLogoError(event: any) {
    console.warn('[Sidebar] No se pudo cargar el logo');
    event.target.style.display = 'none';
  }

  logout() {
    this.menuCtrl.close();
    if (confirm('¿Estás seguro que deseas cerrar sesión?')) {
      this.authService.logout();
      this.router.navigate(['/login']);
    }
  }
}