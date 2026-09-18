import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { IonicModule, ToastController, AlertController } from '@ionic/angular';
import { UsuarioService } from 'src/app/core/services/usuario.service';
import { AuthService } from 'src/app/core/services/auth.service';
import { ROLES, NOMBRES_ROL } from 'src/app/core/models/usuario.model';

@Component({
  selector: 'app-usuarios',
  templateUrl: './usuarios.page.html',
  styleUrls: ['./usuarios.page.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, IonicModule]
})
export class UsuariosPage implements OnInit {
  usuarios: any[] = [];
  cargando: boolean = true;

  mostrarModal = false;
  modoEdicion = false;
  usuarioEditandoId: number | null = null;
  guardando = false;
  errorForm = '';
  usuarioForm: FormGroup;

  readonly ROLES = ROLES;
  readonly NOMBRES_ROL = NOMBRES_ROL;

  constructor(
    private usuarioService: UsuarioService,
    private authService: AuthService,
    private toastController: ToastController,
    private alertController: AlertController,
    private fb: FormBuilder
  ) {
    this.usuarioForm = this.fb.group({
      nombres: ['', [Validators.required, Validators.minLength(2)]],
      apellidos: ['', [Validators.required, Validators.minLength(2)]],
      correo: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.minLength(6)]],
      id_rol: [ROLES.INVESTIGADOR, [Validators.required]]
    });
  }

  ngOnInit() {
    this.cargarUsuarios();
  }

  cargarUsuarios() {
    this.cargando = true;
    this.usuarioService.getUsuarios().subscribe({
      next: (data: any[]) => {
        this.usuarios = data;
        this.cargando = false;
      },
      error: (error) => {
        console.error('Error cargando usuarios:', error);
        this.cargando = false;
        this.mostrarToast('Error al cargar usuarios', 'danger');
      }
    });
  }

  async mostrarToast(mensaje: string, color: string = 'success') {
    const toast = await this.toastController.create({
      message: mensaje,
      duration: 3000,
      color: color,
      position: 'bottom'
    });
    await toast.present();
  }

  /** Roles que el usuario logueado puede asignar. Solo Super Administrador
   * puede crear/editar cuentas de Administrador o Super Administrador -
   * misma regla que ya se valida en el backend (usuarioController.js). */
  get rolesAsignables(): number[] {
    if (this.authService.isSuperAdmin()) {
      return [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.INVESTIGADOR, ROLES.ENCUESTADOR];
    }
    return [ROLES.INVESTIGADOR, ROLES.ENCUESTADOR];
  }

  /** Oculta editar/eliminar sobre cuentas admin/super_admin si quien mira
   * no es super_admin - evita mostrar acciones que el backend va a rechazar. */
  puedeGestionar(usuario: any): boolean {
    if (this.authService.isSuperAdmin()) {
      return true;
    }
    return usuario.id_rol !== ROLES.ADMIN && usuario.id_rol !== ROLES.SUPER_ADMIN;
  }

  abrirModalCrear() {
    this.modoEdicion = false;
    this.usuarioEditandoId = null;
    this.errorForm = '';
    this.usuarioForm.reset({ id_rol: ROLES.INVESTIGADOR });
    this.usuarioForm.get('password')?.setValidators([Validators.required, Validators.minLength(6)]);
    this.usuarioForm.get('password')?.updateValueAndValidity();
    this.mostrarModal = true;
  }

  editarUsuario(usuario: any) {
    if (!this.puedeGestionar(usuario)) {
      this.mostrarToast('Solo un Super Administrador puede editar esta cuenta', 'warning');
      return;
    }
    this.modoEdicion = true;
    this.usuarioEditandoId = usuario.id_usuario;
    this.errorForm = '';
    this.usuarioForm.reset({
      nombres: usuario.nombres,
      apellidos: usuario.apellidos,
      correo: usuario.correo,
      password: '',
      id_rol: usuario.id_rol
    });
    // Al editar, la contraseña es opcional (solo se cambia si se escribe algo)
    this.usuarioForm.get('password')?.setValidators([Validators.minLength(6)]);
    this.usuarioForm.get('password')?.updateValueAndValidity();
    this.mostrarModal = true;
  }

  cerrarModal() {
    this.mostrarModal = false;
  }

  guardarUsuario() {
    if (this.usuarioForm.invalid) {
      this.usuarioForm.markAllAsTouched();
      return;
    }

    this.guardando = true;
    this.errorForm = '';
    const valores = this.usuarioForm.value;

    if (this.modoEdicion && this.usuarioEditandoId !== null) {
      const datos: any = {
        nombres: valores.nombres,
        apellidos: valores.apellidos,
        correo: valores.correo,
        id_rol: valores.id_rol
      };
      if (valores.password) {
        datos.password = valores.password;
      }
      this.usuarioService.actualizarUsuario(this.usuarioEditandoId, datos).subscribe({
        next: () => {
          this.guardando = false;
          this.mostrarModal = false;
          this.mostrarToast('Usuario actualizado correctamente', 'success');
          this.cargarUsuarios();
        },
        error: (error) => {
          this.guardando = false;
          this.errorForm = error.message || 'Error al actualizar usuario';
        }
      });
    } else {
      this.usuarioService.crearUsuario(valores).subscribe({
        next: () => {
          this.guardando = false;
          this.mostrarModal = false;
          this.mostrarToast('Usuario creado correctamente', 'success');
          this.cargarUsuarios();
        },
        error: (error) => {
          this.guardando = false;
          this.errorForm = error.message || 'Error al crear usuario';
        }
      });
    }
  }

  async eliminarUsuario(id: number) {
    const usuario = this.usuarios.find(u => u.id_usuario === id);
    if (usuario && !this.puedeGestionar(usuario)) {
      this.mostrarToast('Solo un Super Administrador puede eliminar esta cuenta', 'warning');
      return;
    }

    const alert = await this.alertController.create({
      header: 'Confirmar eliminación',
      message: '¿Estás seguro de que deseas eliminar este usuario?',
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel'
        },
        {
          text: 'Eliminar',
          role: 'destructive',
          handler: () => {
            this.confirmarEliminar(id);
          }
        }
      ]
    });
    await alert.present();
  }

  confirmarEliminar(id: number) {
    this.usuarioService.eliminarUsuario(id).subscribe({
      next: () => {
        this.mostrarToast('Usuario eliminado correctamente', 'success');
        this.cargarUsuarios();
      },
      error: (error) => {
        console.error('Error eliminando usuario:', error);
        this.mostrarToast(error.message || 'Error al eliminar usuario', 'danger');
      }
    });
  }
}
