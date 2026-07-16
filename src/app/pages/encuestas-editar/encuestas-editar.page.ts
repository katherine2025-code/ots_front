import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms'; // ✅ IMPORTANTE: Para usar ngModel
import { IonicModule } from '@ionic/angular';
import { ActivatedRoute, Router } from '@angular/router';

@Component({
  selector: 'app-encuestas-editar',
  templateUrl: './encuestas-editar.page.html',
  styleUrls: ['./encuestas-editar.page.scss'],
  standalone: true,
  imports: [
    CommonModule, 
    FormsModule,  // ✅ AGREGADO: Esto soluciona los errores de ngModel
    IonicModule
  ]
})
export class EncuestasEditarPage implements OnInit {
  encuestaId: number = 0;
  encuesta: any = {
    id: 1,
    nombre: 'Encuesta Turística - Feriados Nacionales',
    descripcion: 'Encuesta para obtener información de turistas durante feriados',
    tipo: 'turista',
    activa: true,
    preguntas: [
      { id: 1, codigo: 'Q1', texto: '¿Qué edad tiene usted?', tipo: 'numero', obligatoria: true },
      { id: 2, codigo: 'Q2', texto: '¿Con qué género se identifica usted?', tipo: 'seleccion', obligatoria: true },
      { id: 3, codigo: 'Q3', texto: 'Por favor especifique el país', tipo: 'texto', obligatoria: true }
    ]
  };

  constructor(
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit() {
    this.encuestaId = parseInt(this.route.snapshot.paramMap.get('id') || '0');
  }

  guardarCambios() {
    alert('Cambios guardados exitosamente');
    this.router.navigate(['/encuestas']);
  }

  cancelar() {
    this.router.navigate(['/encuestas']);
  }

  agregarPregunta() {
    const nuevaPregunta = {
      id: this.encuesta.preguntas.length + 1,
      codigo: `Q${this.encuesta.preguntas.length + 1}`,
      texto: 'Nueva pregunta',
      tipo: 'texto',
      obligatoria: false
    };
    this.encuesta.preguntas.push(nuevaPregunta);
  }

  eliminarPregunta(id: number) {
    // ✅ Tipado correcto del parámetro p
    this.encuesta.preguntas = this.encuesta.preguntas.filter((p: any) => p.id !== id);
  }
}