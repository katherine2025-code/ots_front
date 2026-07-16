import { AuthResponse } from './../../core/models/usuario.model';
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { Router } from '@angular/router';
import { AuthService } from 'src/app/core/services/auth.service';
import { LoginRequest } from 'src/app/core/models/usuario.model';

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, IonicModule]
})
export class LoginPage {
  loginForm: FormGroup;
  loading = false;
  error = '';

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router
  ) {
    this.loginForm = this.fb.group({
      correo: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]]
    });
  }

  get f() {
    return this.loginForm.controls;
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

    console.log('[LoginPage] Intentando login con:', credentials);

    this.authService.login(credentials).subscribe({
     next: (response) => {
      console.log('[LoginPage] Login exitoso:', response);
      this.loading = false;
      this.router.navigate(['/dashboard']);
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

  private markFormGroupTouched(formGroup: FormGroup) {
    Object.values(formGroup.controls).forEach(control => {
      control.markAsTouched();
      if (control instanceof FormGroup) {
        this.markFormGroupTouched(control);
      }
    });
  }
}