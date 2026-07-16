import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { SidebarComponent } from 'src/app/shared/components/sidebar/sidebar.component';
import { AuthService } from 'src/app/core/services/auth.service';

@Component({
  selector: 'app-perfil',
  templateUrl: './perfil.page.html',
  styleUrls: ['./perfil.page.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, IonicModule, SidebarComponent]
})
export class PerfilPage implements OnInit {
  usuario: any = null;
  rolNombre: string = '';
  perfilForm: FormGroup;
  fotoPerfil: string = '';
  selectedFile: File | null = null;
  loading = false;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService
  ) {
    this.perfilForm = this.fb.group({
      nombres: [''],
      apellidos: [''],
      correo: ['']
    });
  }

  ngOnInit() {
    this.authService.currentUser$.subscribe(user => {
      this.usuario = user;
      this.rolNombre = this.authService.getRolNombre();
      this.cargarDatosUsuario();
      this.cargarFotoPerfil();
    });
  }

  cargarDatosUsuario() {
    this.perfilForm.patchValue({
      nombres: this.usuario?.nombres || '',
      apellidos: this.usuario?.apellidos || '',
      correo: this.usuario?.correo || ''
    });
  }

  cargarFotoPerfil() {
    const fotoGuardada = localStorage.getItem('foto_perfil');
    if (fotoGuardada) {
      this.fotoPerfil = fotoGuardada;
    } else {
      this.fotoPerfil = 'assets/icon/user-default.png';
    }
  }

  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      this.selectedFile = file;
      
      // Preview
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.fotoPerfil = e.target.result;
      };
      reader.readAsDataURL(file);
    }
  }

  guardarFoto() {
    if (!this.selectedFile) {
      alert('Por favor selecciona una imagen primero');
      return;
    }

    this.loading = true;
    
    // Guardar en localStorage (en producción sería en el backend)
    const reader = new FileReader();
    reader.onload = (e: any) => {
      localStorage.setItem('foto_perfil', e.target.result);
      this.loading = false;
      alert('Foto de perfil actualizada correctamente');
    };
    reader.readAsDataURL(this.selectedFile);
  }

  eliminarFoto() {
    localStorage.removeItem('foto_perfil');
    this.fotoPerfil = 'assets/icon/user-default.png';
    this.selectedFile = null;
    alert('Foto de perfil eliminada');
  }

  guardarCambios() {
    if (this.perfilForm.valid) {
      console.log('Guardar cambios:', this.perfilForm.value);
      alert('Cambios guardados correctamente');
    }
  }
}