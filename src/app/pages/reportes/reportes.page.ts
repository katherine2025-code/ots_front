import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { ReporteService } from 'src/app/core/services/reporte.service';
import { Chart } from 'chart.js';


const NOMBRES_FERIADOS = [
  'Carnaval', 'Semana Santa', 'Día del Trabajador', 'Primer Grito de la Independencia',
  'Día de los Difuntos', 'Navidad', 'Fin de Año'
];

// Paleta categórica de la marca (azul, teal, ámbar, pizarra...); se recicla por índice de opción.
const PALETA = [
  '#2A6F97', '#48A9A7', '#E9A23B', '#475569', '#7FB3D5',
  '#10B981', '#E07A5F', '#94A3B8', '#1F4E6B', '#B7D7D6'
];

@Component({
  selector: 'app-reportes',
  templateUrl: './reportes.page.html',
  styleUrls: ['./reportes.page.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule]
})
export class ReportesPage implements OnInit {
  estadisticas: any = null;
  tabulacion: any = null;
  // Fuente de la tabulación turística: siempre los datos cargados por importación (tabla
  // encuestas_turisticas). Se conserva la propiedad por compatibilidad interna.
  fuenteTab: 'etl' | 'app' = 'etl';
  // Encuesta que se tabula: 'turista' o 'hotel'. La hotelera sale de las encuestas de la app
  // (respuestas_encuestas); la importación de hoteles guarda ocupación, no respuestas de opción.
  encuestaTab: 'turista' | 'hotel' = 'turista';
  cargando: boolean = false;
  fechaGeneracion: Date = new Date();
  charts: any = {};
  chartsPreguntas: any[] = [];

  // ===== Filtros =====
  feriados: string[] = NOMBRES_FERIADOS;
  filtroFeriado: string = '';
  filtroFechaInicio: string = '';
  filtroFechaFin: string = '';
  filtroAnio: number | null = null;
  aniosDisponibles: number[] = [];

  constructor(private reporteService: ReporteService) {
    const anioActual = new Date().getFullYear();
    // Un rango razonable para el selector de año; no limita los datos reales, solo la lista.
    for (let a = anioActual + 1; a >= anioActual - 3; a--) this.aniosDisponibles.push(a);
  }

  ngOnInit() {
    this.cargarEstadisticas();
  }

  get hayFiltrosActivos(): boolean {
    return !!(this.filtroFeriado || this.filtroFechaInicio || this.filtroFechaFin || this.filtroAnio);
  }

  get tieneGastoPorRubro(): boolean {
    return (this.estadisticas?.gastoPorRubro || []).some((r: any) => r.promedio !== null && r.promedio > 0);
  }

  aplicarFiltros() {
    this.cargarEstadisticas();
  }

  // Genera el PDF usando la impresión del navegador: imprime la pantalla completa de Reportes
  // (estadísticas + gráficos + tabulación) con el encabezado institucional y sin los controles.
  // El usuario elige "Guardar como PDF" en el diálogo de impresión.
  imprimirPDF() {
    window.print();
  }

  limpiarFiltros() {
    this.filtroFeriado = '';
    this.filtroFechaInicio = '';
    this.filtroFechaFin = '';
    this.filtroAnio = null;
    this.cargarEstadisticas();
  }

  async cargarEstadisticas() {
    this.cargando = true;
    this.fechaGeneracion = new Date();

    const filtros = {
      feriado: this.filtroFeriado || undefined,
      fechaInicio: this.filtroFechaInicio || undefined,
      fechaFin: this.filtroFechaFin || undefined,
      anio: this.filtroAnio || undefined
    };

    try {
      const [estadisticas, tabulacion]: any = await Promise.all([
        this.reporteService.getEstadisticas(filtros).toPromise(),
        this.cargarTabulacion(filtros)
      ]);
      this.estadisticas = estadisticas;
      this.tabulacion = tabulacion;

      setTimeout(() => {
        this.crearGraficoGastoPorFeriado();
        this.crearGraficoGastoPorRubro();
        this.crearGraficoOcupacion();
        this.crearGraficoPaises();
        this.crearGraficoSatisfaccion();
        this.crearGraficosTabulacion();
      }, 300);

    } catch (error) {
      console.error('❌ Error cargando estadísticas:', error);
    } finally {
      this.cargando = false;
    }
  }

  // Carga la tabulación de la encuesta elegida. La turística sale de los datos importados
  // (encuestas_turisticas); la hotelera sale de las encuestas de la app (todas sus preguntas).
  private async cargarTabulacion(filtros: any): Promise<any> {
    if (this.encuestaTab === 'hotel') {
      const data: any = await this.reporteService.getTabulacionApp({
        tipo: 'hotel', feriado: filtros.feriado,
        fechaInicio: filtros.fechaInicio, fechaFin: filtros.fechaFin
      }).toPromise();
      return this.aplanarTabulacionApp(data);
    }
    if (this.fuenteTab === 'app') {
      const data: any = await this.reporteService.getTabulacionApp({
        tipo: 'turista', feriado: filtros.feriado,
        fechaInicio: filtros.fechaInicio, fechaFin: filtros.fechaFin
      }).toPromise();
      return this.aplanarTabulacionApp(data);
    }
    return this.reporteService.getTabulacion(filtros).toPromise();
  }

  // Cambia entre la encuesta turística y la hotelera, y recarga solo la tabulación.
  async cambiarEncuestaTab(tipo: 'turista' | 'hotel') {
    if (this.encuestaTab === tipo) return;
    this.encuestaTab = tipo;
    const filtros = {
      feriado: this.filtroFeriado || undefined,
      fechaInicio: this.filtroFechaInicio || undefined,
      fechaFin: this.filtroFechaFin || undefined,
      anio: this.filtroAnio || undefined
    };
    this.cargando = true;
    try {
      this.tabulacion = await this.cargarTabulacion(filtros);
      setTimeout(() => this.crearGraficosTabulacion(), 300);
    } catch (error) {
      console.error('Error al cambiar la encuesta de tabulación:', error);
    } finally {
      this.cargando = false;
    }
  }

  // Convierte la respuesta de tabulacion-app (secciones -> preguntas) al formato plano que ya
  // usa la vista. Solo preguntas con opciones (categóricas); las abiertas/numéricas se resumen
  // en Estadísticas.
  private aplanarTabulacionApp(data: any): any {
    const preguntas: any[] = [];
    for (const s of (data?.secciones || [])) {
      for (const p of (s.preguntas || [])) {
        if (!p.opciones || p.opciones.length === 0) continue;
        preguntas.push({
          seccion: s.seccion,
          titulo: p.titulo,
          totalReal: p.respondidas,
          sinDato: p.sinDato,
          opciones: p.opciones,
          multiple: p.tipo === 'multiselect'
        });
      }
    }
    return { preguntas, total: data?.total || 0, encuesta: data?.encuesta, fuente: 'app' };
  }

  // (Reservado) Cambia la fuente de la tabulación turística y recarga. Hoy el selector de fuente
  // no se muestra; la turística usa siempre los datos importados.
  async cambiarFuenteTab(fuente: 'etl' | 'app') {
    if (this.fuenteTab === fuente) return;
    this.fuenteTab = fuente;
    const filtros = {
      feriado: this.filtroFeriado || undefined,
      fechaInicio: this.filtroFechaInicio || undefined,
      fechaFin: this.filtroFechaFin || undefined,
      anio: this.filtroAnio || undefined
    };
    this.cargando = true;
    try {
      this.tabulacion = await this.cargarTabulacion(filtros);
      setTimeout(() => this.crearGraficosTabulacion(), 300);
    } catch (error) {
      console.error('Error al cambiar la fuente de tabulación:', error);
    } finally {
      this.cargando = false;
    }
  }

  // ==========================================
  // TABULACIÓN POR PREGUNTA (Sección A, B, C...)
  // ==========================================
  crearGraficosTabulacion() {
    for (const c of this.chartsPreguntas) c?.destroy();
    this.chartsPreguntas = [];

    (this.tabulacion?.preguntas || []).forEach((p: any, i: number) => {
      const ctx = document.getElementById('chart-pregunta-' + i) as HTMLCanvasElement;
      if (!ctx) return;

      const colores = p.opciones.map((_: any, j: number) => PALETA[j % PALETA.length]);
      // Pocas opciones: dona (se lee mejor como proporción del total). Muchas opciones o
      // etiquetas largas: barra horizontal (los nombres no se amontonan). Las de opción
      // múltiple SIEMPRE van en barra: sus porcentajes no suman 100 (cada encuestado marca
      // varias), así que una dona sería engañosa.
      const tipo = (p.multiple || p.opciones.length > 4) ? 'bar' : 'doughnut';

      const chart = new Chart(ctx, {
        type: tipo,
        data: {
          labels: p.opciones.map((o: any) => o.etiqueta),
          datasets: [{
            data: p.opciones.map((o: any) => o.porcentaje),
            backgroundColor: colores,
            borderWidth: tipo === 'doughnut' ? 2 : 0
          }]
        },
        options: tipo === 'doughnut' ? {
          responsive: true, maintainAspectRatio: false,
          plugins: { legend: { display: false } }
        } : {
          indexAxis: 'y',
          responsive: true, maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: { x: { beginAtZero: true, ticks: { callback: (v: any) => v + '%' } } }
        }
      });
      this.chartsPreguntas.push(chart);
    });
  }

  colorOpcion(indicePregunta: number, indiceOpcion: number): string {
    return PALETA[indiceOpcion % PALETA.length];
  }

  // true cuando la pregunta en el índice i abre una sección nueva (para mostrar el encabezado
  // "Sección A. Perfil Sociodemográfico" solo una vez, no antes de cada pregunta).
  esNuevaSeccion(i: number): boolean {
    const preguntas = this.tabulacion?.preguntas || [];
    return i === 0 || preguntas[i].seccion !== preguntas[i - 1].seccion;
  }

  // "Sección A", "Sección B"... según el orden en que aparece cada sección por primera vez.
  letraSeccion(seccion: string): string {
    const preguntas = this.tabulacion?.preguntas || [];
    const orden: string[] = [];
    for (const p of preguntas) if (!orden.includes(p.seccion)) orden.push(p.seccion);
    const idx = orden.indexOf(seccion);
    return String.fromCharCode(65 + (idx >= 0 ? idx : 0));
  }

  // ==========================================
  // GRÁFICOS (datos reales, sin cifras inventadas)
  // ==========================================

  crearGraficoGastoPorFeriado() {
    const ctx = document.getElementById('gastoChart') as HTMLCanvasElement;
    if (!ctx) return;

    if (this.charts.gasto) this.charts.gasto.destroy();

    const datos: any[] = this.estadisticas?.gastoPorFeriado || [];

    this.charts.gasto = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: datos.map(d => d.feriado),
        datasets: [{
          label: 'Gasto Promedio por Turista (USD)',
          data: datos.map(d => d.gasto_promedio !== null ? Number(d.gasto_promedio) : 0),
          backgroundColor: 'rgba(42, 111, 151, 0.85)',
          borderColor: 'rgba(42, 111, 151, 1)',
          borderWidth: 2
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          title: { display: false }
        },
        scales: {
          y: { beginAtZero: true, ticks: { callback: (value) => '$' + value } }
        }
      }
    });
  }

  crearGraficoGastoPorRubro() {
    const ctx = document.getElementById('gastoRubroChart') as HTMLCanvasElement;
    if (!ctx) return;
    if (this.charts.gastoRubro) this.charts.gastoRubro.destroy();

    const datos: any[] = (this.estadisticas?.gastoPorRubro || []).filter((r: any) => r.promedio !== null);
    if (!datos.length) return;

    this.charts.gastoRubro = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: datos.map(d => d.rubro),
        datasets: [{
          label: 'Gasto Promedio por Rubro (USD/día)',
          data: datos.map(d => Number(d.promedio)),
          backgroundColor: 'rgba(72, 169, 167, 0.85)',
          borderColor: 'rgba(72, 169, 167, 1)',
          borderWidth: 2
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          title: { display: false }
        },
        scales: { y: { beginAtZero: true, ticks: { callback: (value) => '$' + value } } }
      }
    });
  }

  crearGraficoOcupacion() {
    const ctx = document.getElementById('ocupacionChart') as HTMLCanvasElement;
    if (!ctx) return;

    if (this.charts.ocupacion) this.charts.ocupacion.destroy();

    const ocupacion = this.estadisticas?.ocupacion?.ocupacion_promedio;
    if (ocupacion === null || ocupacion === undefined) return;

    this.charts.ocupacion = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: ['Ocupación Promedio', 'Disponibilidad'],
        datasets: [{
          data: [ocupacion, 100 - ocupacion],
          backgroundColor: ['#2A6F97', '#E2E8F0'],
          borderWidth: 2
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'bottom' },
          title: { display: false }
        }
      }
    });
  }

  crearGraficoPaises() {
    const ctx = document.getElementById('paisesChart') as HTMLCanvasElement;
    if (!ctx) return;

    if (this.charts.paises) this.charts.paises.destroy();

    const datos: any[] = this.estadisticas?.paises || [];
    const paleta = PALETA;

    this.charts.paises = new Chart(ctx, {
      type: 'pie',
      data: {
        labels: datos.map(d => d.pais),
        datasets: [{
          data: datos.map(d => d.total),
          backgroundColor: paleta.slice(0, datos.length),
          borderWidth: 2
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'right' },
          title: { display: false }
        }
      }
    });
  }

  crearGraficoSatisfaccion() {
    const ctx = document.getElementById('satisfaccionChart') as HTMLCanvasElement;
    if (!ctx) return;

    if (this.charts.satisfaccion) this.charts.satisfaccion.destroy();

    const satisfaccion = this.estadisticas?.encuestas?.satisfaccion_promedio;
    if (satisfaccion === null || satisfaccion === undefined) return;

    this.charts.satisfaccion = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: ['Nivel de Satisfacción General'],
        datasets: [{
          label: 'Puntuación (1-5)',
          data: [satisfaccion],
          backgroundColor: 'rgba(233, 162, 59, 0.85)',
          borderColor: 'rgba(233, 162, 59, 1)',
          borderWidth: 2
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          title: { display: false }
        },
        scales: { y: { beginAtZero: true, max: 5, ticks: { stepSize: 1 } } }
      }
    });
  }
}
