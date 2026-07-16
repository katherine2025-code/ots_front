import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { Router } from '@angular/router';
import { AuthService } from 'src/app/core/services/auth.service';

@Component({
  selector: 'app-registro',
  templateUrl: './registro.page.html',
  styleUrls: ['./registro.page.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, IonicModule]
})
export class RegistroPage {
  registroForm: FormGroup;
  loading = false;
  error = '';

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router
  ) {
    this.registroForm = this.fb.group({
      nombres: ['', [Validators.required, Validators.minLength(2)]],
      apellidos: ['', [Validators.required, Validators.minLength(2)]],
      correo: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]]
    });
  }

  get f() {
    return this.registroForm.controls;
  }

  onSubmit(): void {
    if (this.registroForm.invalid) {
      this.markFormGroupTouched(this.registroForm);
      return;
    }

    this.loading = true;
    this.error = '';

    const registroData = {
      nombres: this.f['nombres'].value,
      apellidos: this.f['apellidos'].value,
      correo: this.f['correo'].value,
      password: this.f['password'].value,
      id_rol: 2 // Por defecto rol de investigador
    };

    this.authService.registro(registroData).subscribe({
      next: (response) => {
        this.loading = false;
        alert('Usuario registrado exitosamente. Ahora puede iniciar sesión.');
        this.router.navigate(['/login']);
      },
      error: (err) => {
        this.loading = false;
        this.error = err.error?.error || 'Error al registrar usuario';
      }
    });
  }

  irALogin(): void {
    this.router.navigate(['/login']);
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