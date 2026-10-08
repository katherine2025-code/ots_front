import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { Router } from '@angular/router';
import { AuthService } from 'src/app/core/services/auth.service';

@Component({
  selector: 'app-olvide-password',
  templateUrl: './olvide-password.page.html',
  styleUrls: ['../login/login.page.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, IonicModule]
})
export class OlvidePasswordPage {
  form: FormGroup;
  loading = false;
  error = '';
  enviado = false;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router
  ) {
    this.form = this.fb.group({
      correo: ['', [Validators.required, Validators.email]]
    });
  }

  get f() {
    return this.form.controls;
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading = true;
    this.error = '';

    this.authService.olvidePassword(this.f['correo'].value).subscribe({
      next: () => {
        this.loading = false;
        this.enviado = true;
      },
      error: (err) => {
        this.loading = false;
        this.error = err?.message || 'No se pudo procesar la solicitud. Intenta de nuevo.';
      }
    });
  }

  volverLogin(): void {
    this.router.navigate(['/login']);
  }
}
