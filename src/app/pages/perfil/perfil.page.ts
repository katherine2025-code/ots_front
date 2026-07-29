import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule, AlertController } from '@ionic/angular';
import { AuthService } from 'src/app/core/services/auth.service';

@Component({
  selector: 'app-perfil',
  templateUrl: './perfil.page.html',
  styleUrls: ['./perfil.page.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule]
})
export class PerfilPage implements OnInit {
  usuario: any = null;
  perfilForm = {
    nombres: '',
    apellidos: '',
    correo: '',
    telefono: ''
  };

  constructor(
    private authService: AuthService,
    private alertController: AlertController
  ) {}

  ngOnInit() {
    this.authService.currentUser$.subscribe(user => {
      this.usuario = user;
      if (user) {
        this.perfilForm = {
          nombres: user.nombres || '',
          apellidos: user.apellidos || '',
          correo: user.correo || '',
          telefono: user.telefono || ''
        };
      }
    });
  }

  async guardarCambios() {
    const alert = await this.alertController.create({
      header: 'Perfil Actualizado',
      message: 'Los cambios se han guardado correctamente.',
      buttons: ['OK']
    });
    await alert.present();
  }

  async cambiarContrasena() {
    const alert = await this.alertController.create({
      header: 'Cambiar Contraseña',
      inputs: [
        { name: 'actual', type: 'password', placeholder: 'Contraseña actual' },
        { name: 'nueva', type: 'password', placeholder: 'Nueva contraseña' },
        { name: 'confirmar', type: 'password', placeholder: 'Confirmar contraseña' }
      ],
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Cambiar',
          handler: (data) => {
            console.log('Cambiando contraseña:', data);
            // Implementar lógica de cambio de contraseña
          }
        }
      ]
    });
    await alert.present();
  }
}