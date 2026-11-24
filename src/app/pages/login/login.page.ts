import { AuthResponse } from './../../core/models/usuario.model';
import { Component, NgZone, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { Router } from '@angular/router';
import { AuthService } from 'src/app/core/services/auth.service';
import { LoginRequest, ROLES } from 'src/app/core/models/usuario.model';

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, IonicModule]
})
export class LoginPage implements OnInit, OnDestroy {
  loginForm: FormGroup;
  loading = false;
  error = '';

  // true cuando el navegador permite instalar la app (PWA) y aún no está instalada.
  puedeInstalar = false;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private zone: NgZone
  ) {
    this.loginForm = this.fb.group({
      correo: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]]
    });
  }

  get f() {
    return this.loginForm.controls;
  }

  ngOnInit(): void {
    // Si el evento de instalación ya se disparó antes de abrir esta pantalla.
    if ((window as any).__deferredInstallPrompt) {
      this.puedeInstalar = true;
    }
    window.addEventListener('pwa-installable', this.onInstallable);
    window.addEventListener('pwa-installed', this.onInstalled);
  }

  ngOnDestroy(): void {
    window.removeEventListener('pwa-installable', this.onInstallable);
    window.removeEventListener('pwa-installed', this.onInstalled);
  }

  private onInstallable = (): void => {
    this.zone.run(() => (this.puedeInstalar = true));
  };

  private onInstalled = (): void => {
    this.zone.run(() => (this.puedeInstalar = false));
  };

  // Lanza el diálogo nativo "Instalar aplicación" del navegador.
  async instalarApp(): Promise<void> {
    const deferred = (window as any).__deferredInstallPrompt;
    if (!deferred) {
      return;
    }
    deferred.prompt();
    try {
      await deferred.userChoice;
    } catch {
      // el usuario cerró el diálogo; no hay nada que hacer
    }
    // El evento solo puede usarse una vez.
    (window as any).__deferredInstallPrompt = null;
    this.puedeInstalar = false;
  }

  onSubmit(): void {
    if (this.loginForm.invalid) {
      this.markFormGroupTouched(this.loginForm);
      return;
    }

    this.loading = true;
    this.error = '';

    const credentials: LoginRequest = {
      correo: this.f['correo'].value,
      password: this.f['password'].value
    };

    this.authService.login(credentials).subscribe({
     next: (response) => {
      this.loading = false;
      // Encuestador no tiene Dashboard/Reportes - su pantalla de inicio es
      // "Mis Encuestas". El resto de roles sí van al Dashboard como antes.
      const destino = response.usuario?.id_rol === ROLES.ENCUESTADOR ? '/mis-encuestas' : '/dashboard';
      this.router.navigate([destino]);
    },
      error: (err) => {
        this.loading = false;
        this.error = err.error?.message || 'Error al iniciar sesión. Verifique sus credenciales.';
      }
    });
  }

  //Método para ir a la página de registro
  irARegistro(): void {
    this.router.navigate(['/registro']);
  }

  // Ir a la pantalla de "¿Olvidaste tu contraseña?"
  irAOlvide(): void {
    this.router.navigate(['/olvide-password']);
  }

  private markFormGroupTouched(formGroup: FormGroup) {
    Object.values(formGroup.controls).forEach(control => {
      control.markAsTouched();
      if (control instanceof FormGroup) {
        this.markFormGroupTouched(control);
      }
    });
  }
}