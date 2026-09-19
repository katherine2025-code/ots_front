import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule, ToastController } from '@ionic/angular';
import { ActivatedRoute, Router } from '@angular/router';
import { Encuesta, EncuestaService, PreguntaEncuesta } from 'src/app/core/services/encuesta.service';

@Component({
  selector: 'app-encuestas-editar',
  templateUrl: './encuestas-editar.page.html',
  styleUrls: ['./encuestas-editar.page.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule]
})
export class EncuestasEditarPage implements OnInit {
  encuestaId: number = 0;
  encuesta: Encuesta | null = null;
  preguntas: PreguntaEncuesta[] = [];
  cargando: boolean = false;
  guardando: boolean = false;
  errorCarga: string = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private encuestaService: EncuestaService,
    private toastController: ToastController
  ) {}

  ngOnInit() {
    this.encuestaId = parseInt(this.route.snapshot.paramMap.get('id') || '0');
    this.cargando = true;

    this.encuestaService.getEncuesta(this.encuestaId).subscribe({
      next: (encuesta) => {
        this.encuesta = encuesta;
        this.preguntas = encuesta.preguntas || [];
        this.cargando = false;
      },
      error: (err) => {
        this.errorCarga = err.message;
        this.cargando = false;
      }
    });
  }

  guardarCambios() {
    if (!this.encuesta || this.guardando) return;

    this.guardando = true;
    this.encuestaService.actualizarEncuesta(this.encuestaId, {
      nombre: this.encuesta.nombre,
      descripcion: this.encuesta.descripcion,
      activa: this.encuesta.activa,
      preguntas: this.preguntas
    }).subscribe({
      next: async () => {
        this.guardando = false;
        await this.mostrarMensaje('Cambios guardados exitosamente', 'success');
        this.router.navigate(['/encuestas']);
      },
      error: (err) => {
        this.guardando = false;
        this.mostrarMensaje(err.message, 'danger');
      }
    });
  }

  cancelar() {
    this.router.navigate(['/encuestas']);
  }

  // Agrega una pregunta al final de la sección indicada (o de la última sección)
  agregarPregunta(seccion?: string) {
    const destino = seccion ?? this.obtenerSecciones().slice(-1)[0] ?? 'Nueva sección';
    const nueva: PreguntaEncuesta = {
      codigo: '',  // el backend asigna un código único a las preguntas nuevas
      texto: 'Nueva pregunta',
      tipo: 'text',
      seccion: destino,
      obligatoria: false
    };

    const ultimoIndice = this.preguntas.map(p => p.seccion).lastIndexOf(destino);
    if (ultimoIndice === -1) {
      this.preguntas.push(nueva);
    } else {
      this.preguntas.splice(ultimoIndice + 1, 0, nueva);
    }
  }

  eliminarPregunta(pregunta: PreguntaEncuesta) {
    this.preguntas = this.preguntas.filter(p => p !== pregunta);
  }

  // Las preguntas de tipo selección/escala tienen respuestas (opciones) editables
  tieneOpciones(pregunta: PreguntaEncuesta): boolean {
    return ['select', 'multiselect', 'escala'].includes(pregunta.tipo);
  }

  agregarOpcion(pregunta: PreguntaEncuesta) {
    if (!Array.isArray(pregunta.opciones)) pregunta.opciones = [];
    pregunta.opciones.push('Nueva opción');
  }

  eliminarOpcion(pregunta: PreguntaEncuesta, index: number) {
    pregunta.opciones?.splice(index, 1);
  }

  // Evita que el input pierda el foco al editar un string dentro del ngFor
  trackByIndex(index: number): number {
    return index;
  }

  obtenerSecciones(): string[] {
    return Array.from(new Set(this.preguntas.map(p => p.seccion)));
  }

  getPreguntasPorSeccion(seccion: string): PreguntaEncuesta[] {
    return this.preguntas.filter(p => p.seccion === seccion);
  }

  private async mostrarMensaje(mensaje: string, color: 'success' | 'danger') {
    const toast = await this.toastController.create({ message: mensaje, duration: 2500, color });
    await toast.present();
  }
}
