import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { RouterLink } from '@angular/router';
import { FeriadoOcupacion, OcupacionService, SIN_FERIADO } from 'src/app/core/services/ocupacion.service';

@Component({
  selector: 'app-ocupacion',
  templateUrl: './ocupacion.page.html',
  styleUrls: ['./ocupacion.page.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule, RouterLink]
})
export class OcupacionPage implements OnInit {
  readonly SIN_FERIADO = SIN_FERIADO;
  readonly TODOS = '';

  ocupacion: any[] = [];
  loading: boolean = true;

  // Filtro por feriado: '' = todos los feriados, SIN_FERIADO = sin feriado asignado (Kobo)
  feriadoSeleccionado: string = this.TODOS;
  feriadosDisponibles: FeriadoOcupacion[] = [];
  totalSinFeriado: number = 0;
  cargandoFeriados: boolean = true;

  // Métricas calculadas (del filtro actual)
  ocupacionPromedio: number = 0;
  ocupacionMaxima: number = 0;
  ocupacionMinima: number = 0;
  totalRegistros: number = 0;

  constructor(private ocupacionService: OcupacionService) { }

  ngOnInit() {
    this.cargarFeriados();
    this.cargarOcupacion();
  }

  // Lista de feriados para el selector: se pide aparte porque cubre TODA la tabla, no solo
  // la página de hasta 500 registros que trae la lista principal.
  cargarFeriados() {
    this.cargandoFeriados = true;
    this.ocupacionService.getFeriados().subscribe({
      next: (data) => {
        this.feriadosDisponibles = data.feriados || [];
        this.totalSinFeriado = data.sinFeriado || 0;
        this.cargandoFeriados = false;
      },
      error: (err: any) => {
        console.error('Error al cargar feriados de ocupación:', err);
        this.cargandoFeriados = false;
      }
    });
  }

  cambiarFeriado(valor: string) {
    this.feriadoSeleccionado = valor ?? this.TODOS;
    this.cargarOcupacion();
  }

  cargarOcupacion() {
    this.loading = true;
    const filtros = this.feriadoSeleccionado ? { feriado: this.feriadoSeleccionado } : undefined;
    this.ocupacionService.getOcupacionGeneral(filtros).subscribe({
      next: (data: any[]) => {
        this.ocupacion = data || [];
        this.calcularMetricas();
        this.loading = false;
      },
      error: (err: any) => {
        console.error('Error al cargar ocupación:', err);
        this.loading = false;
        this.ocupacion = [];
      }
    });
  }

  calcularMetricas() {
    if (this.ocupacion.length === 0) {
      this.ocupacionPromedio = 0;
      this.ocupacionMaxima = 0;
      this.ocupacionMinima = 0;
      this.totalRegistros = 0;
      return;
    }

    // Solo se promedian registros con capacidad conocida (habitaciones_totales > 0). Un registro
    // en 0% porque no se sabe la capacidad del hotel ese día no debe contar como "0% de ocupación".
    const valores = this.ocupacion
      .filter(item => (item.habitaciones_totales || 0) > 0)
      .map(item => parseFloat(item.ocupacion_porcentaje) || 0);

    if (valores.length === 0) {
      this.ocupacionPromedio = 0;
      this.ocupacionMaxima = 0;
      this.ocupacionMinima = 0;
      this.totalRegistros = this.ocupacion.length;
      return;
    }

    this.ocupacionPromedio = valores.reduce((a, b) => a + b, 0) / valores.length;
    this.ocupacionMaxima = Math.max(...valores);
    this.ocupacionMinima = Math.min(...valores);
    this.totalRegistros = this.ocupacion.length;
  }

  // Un registro sin capacidad conocida (habitaciones_totales = 0, típico de cargas antiguas del
  // ETL que no traían ese dato) no es "ocupación baja": es un dato faltante y se marca aparte.
  tieneCapacidad(item: any): boolean {
    return (item.habitaciones_totales || 0) > 0;
  }

  getOcupacionClass(valor: number): string {
    if (!valor) return 'low';
    if (valor >= 80) return 'high';
    if (valor >= 50) return 'medium';
    return 'low';
  }

  getOcupacionLabel(valor: number): string {
    if (!valor) return 'Baja';
    if (valor >= 80) return 'Alta';
    if (valor >= 50) return 'Media';
    return 'Baja';
  }
}
