import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule, ToastController } from '@ionic/angular';
import { Chart } from 'chart.js';
import { EtlService } from 'src/app/core/services/etl.service';
import { AuthService } from 'src/app/core/services/auth.service';
import { PrediccionService } from 'src/app/core/services/prediccion.service';

type Nivel = 'baja' | 'media' | 'alta';

// Un día de la "marea": columna cuya altura es la ocupación prevista
interface DiaMarea {
  fecha: string;          // YYYY-MM-DD
  ocupacion: number;
  nivel: Nivel;
  temporada: string;
  esPico: boolean;
  etiqueta: string;       // "sáb 8 nov"
  marcaEje: string;       // texto bajo la columna (solo en algunas, para no saturar)
  clave: boolean;         // marca que se mantiene visible en pantallas estrechas (1.º de mes, 5, 10, 15...)
}

interface FilaModelo {
  nombre: string;
  enUso: boolean;
  precision: number;
  rmse: number;
  mae: number;
  r2: number;
}

const DIAS_CORTOS = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];
const DIAS_LARGOS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

// Colores por nivel (los mismos de la marea) para los gráficos de apoyo
const COLOR_NIVEL: Record<Nivel, string> = { baja: '#48A9A7', media: '#2A6F97', alta: '#E9A23B' };

// Fecha local YYYY-MM-DD. toISOString() usa UTC: en Ecuador, después de las 19:00 ya daba "mañana".
function fechaLocal(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

// "2026-11-08" -> Date a mediodía local (evita corrimientos de zona horaria)
function aFecha(iso: string): Date {
  const [a, m, d] = iso.split('-').map(Number);
  return new Date(a, m - 1, d, 12);
}

export function nivelDe(ocupacion: number): Nivel {
  if (ocupacion >= 80) return 'alta';
  if (ocupacion >= 50) return 'media';
  return 'baja';
}

@Component({
  selector: 'app-predicciones',
  templateUrl: './predicciones.page.html',
  styleUrls: ['./predicciones.page.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule]
})
export class PrediccionesPage implements OnInit, OnDestroy {
  readonly rangosRapidos = [
    { dias: 7, etiqueta: '7 días' },
    { dias: 15, etiqueta: '15 días' },
    { dias: 30, etiqueta: '30 días' },
    { dias: 90, etiqueta: '3 meses' },
    { dias: 180, etiqueta: '6 meses' },
    { dias: 365, etiqueta: '1 año' }
  ];

  // ===== Modelo en uso =====
  modeloUsado = '';
  precisionModelo: number | null = null;
  modelos: FilaModelo[] = [];
  entrenando = false;

  // ===== Proyección por rango (la vista principal) =====
  fechaInicioRango = '';
  fechaFinRango = '';
  rangoActivo: number | null = 30;
  calculandoRango = false;
  errorRango = '';
  resultadoRango: any = null;
  marea: DiaMarea[] = [];
  diaSeleccionado: DiaMarea | null = null;
  textoPico = '';
  textoValle = '';
  diasAltaTemporada = 0;
  verDesglose = false;
  private temporizadorRango?: ReturnType<typeof setTimeout>;

  // ===== Un día en concreto =====
  fechaObjetivo = '';
  temporada = 'Media';
  prediciendo = false;
  errorDia = '';
  prediccion: any = null;

  // ===== Validación histórica =====
  cargandoHistoricas = false;
  prediccionesHistoricas: any[] = [];
  precisionPromedio = 0;
  errorPromedio = 0;
  totalRegistrosAnalizados = 0;

  private chartDiaSemana?: Chart;
  private chartTemporada?: Chart;
  private chartHistoricas?: Chart;

  constructor(
    private etlService: EtlService,
    private authService: AuthService,
    private prediccionService: PrediccionService,
    private toastController: ToastController
  ) { }

  get isSuperAdmin(): boolean {
    return this.authService.isSuperAdmin();
  }

  get isInvestigador(): boolean {
    return this.authService.isInvestigador();
  }

  // Administrador "puro": no entrena ni proyecta (lo remite al dashboard)
  get esSoloAdmin(): boolean {
    return this.authService.isAdmin() && !this.isSuperAdmin;
  }

  get puedeProyectar(): boolean {
    return this.isSuperAdmin || this.isInvestigador;
  }

  ngOnInit() {
    const manana = new Date();
    manana.setDate(manana.getDate() + 1);
    this.fechaObjetivo = fechaLocal(manana);

    this.cargarMetricas();
    if (this.puedeProyectar) {
      // 30 días: horizonte útil para planificar y suficiente para ver el ritmo de fines de semana
      this.seleccionarRangoRapido(30);
    }
  }

  ngOnDestroy() {
    clearTimeout(this.temporizadorRango);
    [this.chartDiaSemana, this.chartTemporada, this.chartHistoricas].forEach(c => c?.destroy());
  }

  private async avisar(mensaje: string, color: string) {
    const toast = await this.toastController.create({ message: mensaje, duration: 3000, color, position: 'bottom' });
    await toast.present();
  }

  // ==========================================
  // MODELO EN USO Y COMPARACIÓN
  // ==========================================
  async cargarMetricas() {
    try {
      const r: any = await this.etlService.getMetricas().toPromise();
      if (r?.entrenado) {
        this.aplicarMetricas(r.metricas, r.modelo_usado);
      }
    } catch {
      // Sin modelo o servicio caído: la cabecera lo indica y las acciones muestran el error concreto
    }
  }

  private aplicarMetricas(metricas: any, enUso: string) {
    this.modeloUsado = enUso || '';
    this.modelos = ['Random Forest', 'XGBoost', 'Prophet']
      .filter(nombre => metricas?.[nombre])
      .map(nombre => ({
        nombre,
        enUso: nombre === enUso,
        precision: Number(metricas[nombre].precision) || 0,
        rmse: Number(metricas[nombre].rmse) || 0,
        mae: Number(metricas[nombre].mae) || 0,
        r2: Number(metricas[nombre].r2) || 0
      }));
    this.precisionModelo = this.modelos.find(m => m.enUso)?.precision ?? null;
  }

  async entrenarModelo() {
    this.entrenando = true;
    try {
      const r: any = await this.prediccionService.entrenarModelo().toPromise();
      this.aplicarMetricas(r.metricas, r.mejor_modelo);
      this.avisar(`Modelos reentrenados. En uso: ${r.mejor_modelo}`, 'success');
    } catch (e: any) {
      this.avisar(e?.message || 'No se pudo entrenar los modelos.', 'danger');
    } finally {
      this.entrenando = false;
    }
  }

  // ==========================================
  // PROYECCIÓN POR RANGO
  // ==========================================
  seleccionarRangoRapido(dias: number) {
    const hoy = new Date();
    const fin = new Date();
    fin.setDate(hoy.getDate() + dias - 1);
    this.fechaInicioRango = fechaLocal(hoy);
    this.fechaFinRango = fechaLocal(fin);
    this.rangoActivo = dias;
    this.predecirRango();
  }

  // Al editar una fecha a mano se espera un momento (por si sigue escribiendo) y se proyecta solo:
  // no hace falta un botón aparte ni se lanzan varias peticiones seguidas.
  onFechaRangoChange() {
    this.rangoActivo = null;
    clearTimeout(this.temporizadorRango);
    this.temporizadorRango = setTimeout(() => this.predecirRango(), 450);
  }

  async predecirRango() {
    this.errorRango = '';
    if (!this.fechaInicioRango || !this.fechaFinRango) return;
    if (this.fechaInicioRango > this.fechaFinRango) {
      this.errorRango = 'La fecha final debe ser igual o posterior a la inicial.';
      return;
    }

    this.calculandoRango = true;
    try {
      const r: any = await this.prediccionService.predecirRango(this.fechaInicioRango, this.fechaFinRango).toPromise();
      this.resultadoRango = r;
      if (r?.modelo_usado && !this.modeloUsado) this.modeloUsado = r.modelo_usado;
      this.construirMarea(r);
      setTimeout(() => this.crearGraficosRango(), 50);
    } catch (e: any) {
      this.resultadoRango = null;
      this.marea = [];
      this.errorRango = e?.message || 'No se pudo calcular la proyección.';
    } finally {
      this.calculandoRango = false;
    }
  }

  private construirMarea(r: any) {
    const dias: any[] = r?.predicciones_diarias || [];
    const pico = r?.dia_pico?.fecha;
    // Marcas bajo el eje: todos los días si son pocos; si son muchos, solo el 1.º de cada mes
    const pocos = dias.length <= 31;

    this.marea = dias.map((d, i) => {
      const f = aFecha(d.fecha);
      const ocupacion = Number(d.ocupacion_predicha) || 0;
      let marcaEje = '';
      // Con pocos días: el número de cada día, y el mes cuando empieza uno nuevo ("1 dic")
      if (pocos) marcaEje = f.getDate() === 1 && i > 0 ? `1 ${MESES[f.getMonth()]}` : String(f.getDate());
      else if (f.getDate() === 1 || i === 0) marcaEje = MESES[f.getMonth()];
      return {
        fecha: d.fecha,
        ocupacion,
        nivel: nivelDe(ocupacion),
        temporada: d.temporada,
        esPico: d.fecha === pico,
        etiqueta: `${DIAS_CORTOS[f.getDay()]} ${f.getDate()} ${MESES[f.getMonth()]}`,
        marcaEje,
        clave: i === 0 || f.getDate() === 1 || f.getDate() % 5 === 0
      };
    });

    this.diaSeleccionado = this.marea.find(d => d.esPico) || null;
    const anio = this.cruzaAnio;
    this.textoPico = r?.dia_pico ? this.fechaLarga(r.dia_pico.fecha, anio) : '';
    this.textoValle = r?.dia_valle ? this.fechaLarga(r.dia_valle.fecha, anio) : '';
    this.diasAltaTemporada = this.marea.filter(d => d.temporada === 'Alta').length;
  }

  // "sábado 8 de noviembre" (con el año si se pide: "sábado 8 de noviembre de 2026")
  fechaLarga(iso: string, conAnio = false): string {
    const f = aFecha(iso);
    const meses = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
    return `${DIAS_LARGOS[f.getDay()]} ${f.getDate()} de ${meses[f.getMonth()]}${conAnio ? ' de ' + f.getFullYear() : ''}`;
  }

  // Si el periodo cruza de año se muestra el año: "3 de noviembre y 2 de noviembre" sería ambiguo
  get cruzaAnio(): boolean {
    const r = this.resultadoRango;
    return !!r && String(r.fecha_inicio).slice(0, 4) !== String(r.fecha_fin).slice(0, 4);
  }

  get textoPeriodo(): string {
    if (!this.resultadoRango) return '';
    const anio = this.cruzaAnio;
    return `${this.fechaLarga(this.resultadoRango.fecha_inicio, anio)} y el ${this.fechaLarga(this.resultadoRango.fecha_fin, anio)}`;
  }

  trackPorFecha(_: number, d: DiaMarea): string {
    return d.fecha;
  }

  private crearGraficosRango() {
    // Promedio por día de la semana, en español y de lunes a domingo (el servidor los manda en
    // inglés y en orden de aparición)
    const porDia: number[][] = [[], [], [], [], [], [], []];
    for (const d of this.marea) porDia[aFecha(d.fecha).getDay()].push(d.ocupacion);
    const orden = [1, 2, 3, 4, 5, 6, 0];
    const etiquetas = orden.map(i => DIAS_CORTOS[i]);
    const promedios = orden.map(i => porDia[i].length ? Math.round(porDia[i].reduce((a, b) => a + b, 0) / porDia[i].length) : 0);

    const ctxDia = document.getElementById('chartDiaSemana') as HTMLCanvasElement | null;
    this.chartDiaSemana?.destroy();
    if (ctxDia) {
      this.chartDiaSemana = new Chart(ctxDia, {
        type: 'bar',
        data: {
          labels: etiquetas,
          datasets: [{ label: 'Ocupación promedio (%)', data: promedios, backgroundColor: promedios.map(v => COLOR_NIVEL[nivelDe(v)]) }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: { y: { beginAtZero: true, max: 100, ticks: { callback: v => v + '%' } }, x: { grid: { display: false } } }
        }
      });
    }

    // Promedio por temporada: barras horizontales (se comparan valores, no partes de un todo)
    const temporadas = ['Alta', 'Media', 'Baja'].filter(t => this.resultadoRango?.promedios_temporada?.[t] !== undefined);
    const valoresTemp = temporadas.map(t => Number(this.resultadoRango.promedios_temporada[t]));
    const ctxTemp = document.getElementById('chartTemporada') as HTMLCanvasElement | null;
    this.chartTemporada?.destroy();
    if (ctxTemp && temporadas.length) {
      this.chartTemporada = new Chart(ctxTemp, {
        type: 'bar',
        data: {
          labels: temporadas.map(t => `Temporada ${t.toLowerCase()}`),
          datasets: [{ label: 'Ocupación promedio (%)', data: valoresTemp, backgroundColor: valoresTemp.map(v => COLOR_NIVEL[nivelDe(v)]) }]
        },
        options: {
          indexAxis: 'y',
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: { x: { beginAtZero: true, max: 100, ticks: { callback: v => v + '%' } }, y: { grid: { display: false } } }
        }
      });
    }
  }

  // ==========================================
  // UN DÍA EN CONCRETO
  // ==========================================
  async predecir() {
    this.errorDia = '';
    if (!this.fechaObjetivo) {
      this.errorDia = 'Elige una fecha.';
      return;
    }
    this.prediciendo = true;
    try {
      // Solo fecha y temporada: el backend completa check-in, tarifa y clima con valores típicos
      this.prediccion = await this.prediccionService.predecir({ fecha_objetivo: this.fechaObjetivo, temporada: this.temporada }).toPromise();
    } catch (e: any) {
      this.prediccion = null;
      this.errorDia = e?.message || 'No se pudo calcular la predicción.';
    } finally {
      this.prediciendo = false;
    }
  }

  get nivelPrediccion(): Nivel {
    return nivelDe(Number(this.prediccion?.ocupacion_predicha) || 0);
  }

  // ==========================================
  // VALIDACIÓN HISTÓRICA
  // ==========================================
  async cargarPrediccionesHistoricas() {
    this.cargandoHistoricas = true;
    try {
      const r: any = await this.etlService.getHistoricalPredictions().toPromise();
      this.prediccionesHistoricas = r.predicciones || [];
      this.precisionPromedio = r.precision_promedio || 0;
      this.errorPromedio = r.error_promedio || 0;
      this.totalRegistrosAnalizados = r.total_registros || 0;
      setTimeout(() => this.crearGraficoHistoricas(), 50);
    } catch (e: any) {
      this.avisar(e?.message || 'No se pudo validar. Entrena el modelo primero.', 'warning');
    } finally {
      this.cargandoHistoricas = false;
    }
  }

  private crearGraficoHistoricas() {
    const ctx = document.getElementById('chartHistoricas') as HTMLCanvasElement | null;
    this.chartHistoricas?.destroy();
    if (!ctx || this.prediccionesHistoricas.length === 0) return;

    const ordenadas = [...this.prediccionesHistoricas].sort((a, b) => String(a.fecha).localeCompare(String(b.fecha)));
    this.chartHistoricas = new Chart(ctx, {
      type: 'line',
      data: {
        labels: ordenadas.map(p => p.fecha),
        datasets: [
          { label: 'Ocupación real', data: ordenadas.map(p => p.valor_real), borderColor: '#1F4E6B', backgroundColor: '#1F4E6B', tension: 0.3, pointRadius: 2 },
          { label: 'Lo que predijo el modelo', data: ordenadas.map(p => p.valor_predicho), borderColor: '#E9A23B', backgroundColor: '#E9A23B', borderDash: [6, 4], tension: 0.3, pointRadius: 2 }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { position: 'bottom' } },
        scales: { y: { beginAtZero: true, max: 100, ticks: { callback: v => v + '%' } } }
      }
    });
  }
}
