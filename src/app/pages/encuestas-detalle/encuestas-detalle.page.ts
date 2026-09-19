import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { ActivatedRoute, Router } from '@angular/router';
import { Encuesta, EncuestaService, TipoPregunta } from 'src/app/core/services/encuesta.service';

const ETIQUETAS_TIPO: Record<TipoPregunta, string> = {
  text: 'Texto',
  email: 'Correo',
  number: 'Número',
  date: 'Fecha',
  select: 'Selección',
  multiselect: 'Selección múltiple',
  escala: 'Escala'
};

@Component({
  selector: 'app-encuestas-detalle',
  templateUrl: './encuestas-detalle.page.html',
  styleUrls: ['./encuestas-detalle.page.scss'],
  standalone: true,
  imports: [CommonModule, IonicModule]
})
export class EncuestasDetallePage implements OnInit {
  encuestaId: number = 0;
  encuesta: Encuesta | null = null;
  cargando: boolean = false;
  errorCarga: string = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private encuestaService: EncuestaService
  ) {}

  ngOnInit() {
    this.encuestaId = parseInt(this.route.snapshot.paramMap.get('id') || '0');
    this.cargando = true;

    this.encuestaService.getEncuesta(this.encuestaId).subscribe({
      next: (encuesta) => {
        this.encuesta = encuesta;
        this.cargando = false;
      },
      error: (err) => {
        this.errorCarga = err.message;
        this.cargando = false;
      }
    });
  }

  obtenerSecciones(): string[] {
    if (!this.encuesta?.preguntas) return [];
    const secciones = new Set<string>();
    this.encuesta.preguntas.forEach(p => secciones.add(p.seccion));
    return Array.from(secciones);
  }

  obtenerPreguntasPorSeccion(seccion: string) {
    if (!this.encuesta?.preguntas) return [];
    return this.encuesta.preguntas.filter(p => p.seccion === seccion);
  }

  etiquetaTipo(tipo: TipoPregunta): string {
    return ETIQUETAS_TIPO[tipo] || tipo;
  }

  volver() {
    this.router.navigate(['/encuestas']);
  }
}
