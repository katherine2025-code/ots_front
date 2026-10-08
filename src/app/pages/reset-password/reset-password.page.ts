import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from 'src/app/core/services/auth.service';

@Component({
  selector: 'app-reset-password',
  templateUrl: './reset-password.page.html',
  styleUrls: ['../login/login.page.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, IonicModule]
})
export class ResetPasswordPage implements OnInit {
  form: FormGroup;
  loading = false;
  error = '';
  exito = false;
  token = '';

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private route: ActivatedRoute,
    private router: Router
  ) {
    this.form = this.fb.group({
      password: ['', [Validators.required, Validators.minLength(6)]],
      confirmar: ['', [Validators.required]]
    });
  }

  ngOnInit(): void {
    this.token = this.route.snapshot.queryParamMap.get('token') || '';
    if (!this.token) {
      this.error = 'El enlace no es válido. Solicita el restablecimiento de nuevo.';
    }
  }

  get f() {
    return this.form.controls;
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    if (this.f['password'].value !== this.f['confirmar'].value) {
      this.error = 'Las contraseñas no coinciden.';
      return;
    }
    if (!this.token) {
      this.error = 'El enlace no es válido. Solicita el restablecimiento de nuevo.';
      return;
    }

    this.loading = true;
    this.error = '';

    this.authService.resetPassword(this.token, this.f['password'].value).subscribe({
      next: () => {
        this.loading = false;
        this.exito = true;
      },
      error: (err) => {
        this.loading = false;
        this.error = err?.message || 'No se pudo restablecer la contraseña. El enlace pudo expirar.';
      }
    });
  }

  volverLogin(): void {
    this.router.navigate(['/login']);
  }
}
