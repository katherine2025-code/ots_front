import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule, ToastController } from '@ionic/angular';
import { Subscription } from 'rxjs';
import { AuthService } from 'src/app/core/services/auth.service';

@Component({
  selector: 'app-perfil',
  templateUrl: './perfil.page.html',
  styleUrls: ['./perfil.page.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule]
})
export class PerfilPage implements OnInit, OnDestroy {
  usuario: any = null;
  rolNombre = '';
  iniciales = '?';

  // Cambio de contraseña (PUT /api/auth/cambiar-password)
  passwordActual = '';
  passwordNueva = '';
  passwordConfirmar = '';
  guardando = false;
  errorPassword = '';

  private sub?: Subscription;

  constructor(
    private authService: AuthService,
    private toastCtrl: ToastController
  ) { }

  ngOnInit() {
    this.sub = this.authService.currentUser$.subscribe(user => {
      this.usuario = user;
      if (!user) return;
      this.rolNombre = this.authService.getRolNombre();
      const primera = (texto: unknown) => String(texto || '').trim().charAt(0).toUpperCase();
      this.iniciales = (primera(user.nombres) + primera(user.apellidos)) || '?';
    });
  }

  ngOnDestroy() {
    this.sub?.unsubscribe();
  }

  // Mismo mínimo que valida el backend (authValidator.validarCambioPassword)
  get puedeGuardar(): boolean {
    return !this.guardando && !!this.passwordActual && this.passwordNueva.length >= 6 &&
      this.passwordNueva === this.passwordConfirmar;
  }

  cambiarPassword() {
    this.errorPassword = '';
    if (this.passwordNueva !== this.passwordConfirmar) {
      this.errorPassword = 'La confirmación no coincide con la nueva contraseña.';
      return;
    }
    if (this.passwordNueva === this.passwordActual) {
      this.errorPassword = 'La nueva contraseña debe ser distinta de la actual.';
      return;
    }

    this.guardando = true;
    this.authService.cambiarPassword(this.passwordActual, this.passwordNueva).subscribe({
      next: async () => {
        this.guardando = false;
        this.passwordActual = this.passwordNueva = this.passwordConfirmar = '';
        const toast = await this.toastCtrl.create({
          message: 'Contraseña actualizada correctamente.',
          duration: 2500,
          color: 'success',
          position: 'top'
        });
        await toast.present();
      },
      error: (err: Error) => {
        this.guardando = false;
        this.errorPassword = err.message || 'No se pudo cambiar la contraseña.';
      }
    });
  }
}
