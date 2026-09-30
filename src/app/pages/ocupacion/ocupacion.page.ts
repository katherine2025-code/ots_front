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
    // Tampoco los inconsistentes (más ocupadas que habitaciones): su 100% es un tope, no un dato.
    const valores = this.ocupacion
      .filter(item => this.tieneCapacidad(item) && !this.inconsistenteHab(item))
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

  // Dato inconsistente: el hotel reportó más habitaciones ocupadas que las que tiene. El ETL topa
  // el porcentaje en 100%, pero ese 100% no es real: se marca para revisar y no entra en los
  // promedios. Se compara con los totales del período (capacidad x días), sin redondeos.
  inconsistenteHab(item: any): boolean {
    return this.tieneCapacidad(item) &&
      (item.habitaciones_ocupadas || 0) > item.habitaciones_totales * (item.dias_reportados || 1);
  }

  // Las cargas de Kobo guardan una fila por envío con los TOTALES de los días del feriado
  // (dias_reportados); se muestra el promedio por día, que es lo comparable con la capacidad.
  // Las filas sin dias_reportados (app y CSV) ya son de un solo día.
  porDia(total: number | null, item: any): number {
    const dias = item.dias_reportados > 0 ? item.dias_reportados : 1;
    return Math.round((total || 0) / dias);
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
