import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule, AlertController } from '@ionic/angular';
import { Router } from '@angular/router';
import { AuthService } from 'src/app/core/services/auth.service';
import { Encuesta, EncuestaService } from 'src/app/core/services/encuesta.service';
import { RespuestaService } from 'src/app/core/services/respuesta.service';

@Component({
  selector: 'app-encuestas',
  templateUrl: './encuestas.page.html',
  styleUrls: ['./encuestas.page.scss'],
  standalone: true,
  imports: [CommonModule, IonicModule]
})
export class EncuestasPage implements OnInit {
  encuestas: Encuesta[] = [];
  cargando: boolean = false;

  totalTuristas: number = 0;
  totalHoteles: number = 0;
  totalActivas: number = 0;
  isAdmin: boolean = false;
  isEncuestador: boolean = false;
  puedeVerRespuestas: boolean = false;

  constructor(
    private router: Router,
    private authService: AuthService,
    private alertController: AlertController,
    private encuestaService: EncuestaService,
    private respuestaService: RespuestaService
  ) { }

  ngOnInit() {
    this.isAdmin = this.authService.isAdmin();
    this.puedeVerRespuestas = this.authService.isAdmin();  // super_admin incluido
    this.isEncuestador = this.authService.isEncuestador();
  }

  // Se recarga al volver de la pantalla de edición
  ionViewWillEnter() {
    this.cargarEncuestas();
  }

  cargarEncuestas() {
    this.cargando = true;
    this.encuestaService.getEncuestas().subscribe({
      next: (encuestas) => {
        this.encuestas = encuestas;
        this.calcularTotales();
        this.cargando = false;
      },
      error: (err) => {
        this.cargando = false;
        this.mostrarAlerta(err.message);
      }
    });
  }

  calcularTotales() {
    this.totalTuristas = this.encuestas.filter(e => e.tipo === 'turista').length;
    this.totalHoteles = this.encuestas.filter(e => e.tipo === 'hotel').length;
    this.totalActivas = this.encuestas.filter(e => e.activa).length;
  }

  verDetalles(id: number) {
    this.router.navigate([`/encuestas/detalle/${id}`]);
  }

  editarEncuesta(id: number) {
    if (!this.isAdmin) {
      this.mostrarAlerta('Solo los administradores pueden editar encuestas');
      return;
    }
    this.router.navigate([`/encuestas/editar/${id}`]);
  }

  responderEncuesta(id: number) {
    if (!this.isEncuestador) {
      this.mostrarAlerta('Solo los encuestadores pueden responder encuestas');
      return;
    }
    const encuesta = this.encuestas.find(e => e.id === id);
    if (!encuesta) {
      this.mostrarAlerta('Encuesta no encontrada');
      return;
    }
    this.router.navigate([`/responder-encuesta/${encuesta.tipo}`]);
  }

  // Descarga en CSV (formato del módulo ETL) lo recolectado por los encuestadores
  descargarRespuestas(encuesta: Encuesta) {
    this.respuestaService.exportarCSV(encuesta.tipo).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `respuestas_${encuesta.tipo}_${new Date().toISOString().slice(0, 10)}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      },
      error: (err) => this.mostrarAlerta(err.message)
    });
  }

  async activarDesactivar(id: number) {
    if (!this.isAdmin) {
      this.mostrarAlerta('Solo los administradores pueden activar/desactivar encuestas');
      return;
    }

    const encuesta = this.encuestas.find(e => e.id === id);
    if (!encuesta) return;

    const alert = await this.alertController.create({
      header: 'Confirmar',
      message: `¿Estás seguro de ${encuesta.activa ? 'desactivar' : 'activar'} la encuesta "${encuesta.nombre}"?`,
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel'
        },
        {
          text: 'Confirmar',
          handler: () => {
            this.encuestaService.cambiarEstado(id, !encuesta.activa).subscribe({
              next: (actualizada) => {
                encuesta.activa = actualizada.activa;
                this.calcularTotales();
              },
              error: (err) => this.mostrarAlerta(err.message)
            });
          }
        }
      ]
    });
    await alert.present();
  }

  async mostrarAlerta(mensaje: string) {
    const alert = await this.alertController.create({
      header: 'Información',
      message: mensaje,
      buttons: ['OK']
    });
    await alert.present();
  }
}
