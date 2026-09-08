import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule, ToastController, AlertController } from '@ionic/angular';
import { UsuarioService } from 'src/app/core/services/usuario.service';

@Component({
  selector: 'app-usuarios',
  templateUrl: './usuarios.page.html',
  styleUrls: ['./usuarios.page.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule]  // ❌ Eliminar SidebarComponent
})
export class UsuariosPage implements OnInit {
  usuarios: any[] = [];
  cargando: boolean = true;

  constructor(
    private usuarioService: UsuarioService,
    private toastController: ToastController,
    private alertController: AlertController
  ) { }

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

  abrirModalCrear() {
    // TODO: Implementar modal de creación de usuario
    this.mostrarToast('Funcionalidad en desarrollo', 'warning');
  }

  editarUsuario(usuario: any) {
    // TODO: Implementar edición de usuario
    console.log('Editar usuario:', usuario);
    this.mostrarToast('Funcionalidad en desarrollo', 'warning');
  }

  async eliminarUsuario(id: number) {
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
        this.mostrarToast('Error al eliminar usuario', 'danger');
      }
    });
  }
}