import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule, ToastController } from '@ionic/angular';
import { Chart } from 'chart.js';
import { EtlService } from 'src/app/core/services/etl.service';
import { AuthService } from 'src/app/core/services/auth.service';
import { PrediccionService } from 'src/app/core/services/prediccion.service';


// Colores de ejes y textos de los gráficos sobre fondo blanco.
const EJE_TICK = '#64748b';
const EJE_GRID = 'rgba(15, 23, 42, 0.06)';
const LEYENDA = '#475569';
const TITULO_CHART = '#0f172a';

@Component({
  selector: 'app-predicciones',
  templateUrl: './predicciones.page.html',
  styleUrls: ['./predicciones.page.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule]
})
export class PrediccionesPage implements OnInit {
  // ==========================================
  // PREDICCIÓN POR FERIADO (protagonista)
  // ==========================================
  // Catálogo de feriados nacionales de Ecuador. Los fijos tienen mes/día; los movibles
  // (Carnaval, Semana Santa) se calculan a partir del Domingo de Pascua. 'conDatos' indica si
  // ese feriado tiene datos históricos recolectados que respaldan la estimación.
  private readonly FERIADOS_CAT: Array<any> = [
    { id: 'anio-nuevo',   nombre: 'Año Nuevo (1 ene)',                        tipo: 'fijo',   mes: 1,  dia: 1,  dur: 1, conDatos: false },
    { id: 'carnaval',     nombre: 'Carnaval',                                 tipo: 'pascua', ini: -49, fin: -46,        conDatos: true  },
    { id: 'semana-santa', nombre: 'Semana Santa',                             tipo: 'pascua', ini: -3,  fin: 0,          conDatos: true  },
    { id: 'trabajo',      nombre: 'Día del Trabajador (1 may)',               tipo: 'fijo',   mes: 5,  dia: 1,  dur: 1, conDatos: true  },
    { id: 'pichincha',    nombre: 'Batalla de Pichincha (24 may)',            tipo: 'fijo',   mes: 5,  dia: 24, dur: 1, conDatos: false },
    { id: 'agosto',       nombre: 'Primer Grito de Independencia (10 ago)',   tipo: 'fijo',   mes: 8,  dia: 10, dur: 1, conDatos: true  },
    { id: 'guayaquil',    nombre: 'Independencia de Guayaquil (9 oct)',       tipo: 'fijo',   mes: 10, dia: 9,  dur: 1, conDatos: false },
    { id: 'difuntos',     nombre: 'Difuntos e Independencia de Cuenca (2–3 nov)', tipo: 'fijo', mes: 11, dia: 2, dur: 2, conDatos: true  },
    { id: 'navidad',      nombre: 'Navidad (25 dic)',                         tipo: 'fijo',   mes: 12, dia: 25, dur: 1, conDatos: false }
  ];

  feriadoSel: string = 'carnaval';
  anioSel: number = new Date().getFullYear() + 1;
  aniosDisponibles: number[] = [];

  prediciendoFeriado: boolean = false;
  resultadoFeriado: any = null;
  resultadoFeriadoNombre: string = '';
  resultadoFeriadoAnio: number = 0;
  feriadoMin: number = 0;
  feriadoMax: number = 0;
  chartFeriado: any = null;

  // Catálogo simplificado para el <ion-select> del template.
  get feriadosCatalogo() {
    return this.FERIADOS_CAT.map(f => ({ id: f.id, nombre: f.nombre, conDatos: f.conDatos }));
  }

  // ==========================================
  // MODO DE PREDICCIÓN (avanzado)
  // ==========================================
  modoPrediccion: 'simulador' | 'rango' = 'simulador';
  mostrarAvanzado: boolean = false;

  // ==========================================
  // ESTADOS DE CARGA
  // ==========================================
  entrenando: boolean = false;
  prediciendo: boolean = false;
  calculandoRango: boolean = false;
  cargandoHistoricas: boolean = false;
  modeloListo: boolean = false;
  prediccionCargada: boolean = false;

  // ==========================================
  // DATOS DE COMPARACIÓN Y PREDICCIÓN
  // ==========================================
  metricas: any = null;
  comparacion: any = null;
  prediccion: any = null;
  resultadoRango: any = null;
  prediccionesHistoricas: any[] = [];

  modeloUsado: string = 'Modelo listo';
  precisionPromedio: number = 0;
  errorPromedio: number = 0;
  totalRegistrosAnalizados: number = 0;

  // ==========================================
  // FORMULARIO SIMULADOR (1 DÍA)
  // ==========================================
  fechaObjetivo: string = '';
  checkinNacionales: number = 50;
  checkinExtranjeros: number = 10;
  tarifaCobrada: number = 80;
  temporada: string = 'Media';

  // ==========================================
  // FORMULARIO RANGO (INVESTIGADOR)
  // ==========================================
  fechaInicioRango: string = '';
  fechaFinRango: string = '';

  // ==========================================
  // CHARTS
  // ==========================================
  chartComparacion: any = null;
  chartPrediccion: any = null;
  chartRango: any = null;
  chartDiaSemana: any = null;
  chartTemporada: any = null;
  chartHistoricas: any = null;

  constructor(
    private etlService: EtlService,
    private authService: AuthService,
    private prediccionService: PrediccionService,
    private toastController: ToastController
  ) { }

  // ==========================================
  // GETTERS
  // ==========================================
  get isAdmin(): boolean {
    return this.authService.isAdmin();
  }

  get isSuperAdmin(): boolean {
    return this.authService.isSuperAdmin();
  }

  // Administrador "puro" (no Super Administrador): no entrena modelos ni genera predicciones. La
  // lista de resultados que podía validar/descartar se retiró (nada guardaba predicciones), así que
  // solo ve un aviso que lo remite al dashboard.
  get esSoloAdmin(): boolean {
    return this.isAdmin && !this.isSuperAdmin;
  }

  get isInvestigador(): boolean {
    return this.authService.isInvestigador();
  }

  // ==========================================
  // NGONINIT
  // ==========================================
  ngOnInit() {
    // Años disponibles para predecir feriados: desde el año actual hasta +4.
    const anioActual = new Date().getFullYear();
    this.aniosDisponibles = [anioActual, anioActual + 1, anioActual + 2, anioActual + 3, anioActual + 4];

    // Si es investigador, modo rango por defecto
    if (this.isInvestigador) {
      this.modoPrediccion = 'rango';
    }

    // Fechas por defecto
    const hoy = new Date();
    const manana = new Date();
    manana.setDate(hoy.getDate() + 1);
    this.fechaObjetivo = manana.toISOString().split('T')[0];

    const masSieteDias = new Date();
    masSieteDias.setDate(hoy.getDate() + 7);
    this.fechaInicioRango = hoy.toISOString().split('T')[0];
    this.fechaFinRango = masSieteDias.toISOString().split('T')[0];

    this.cargarMetricas();
  }

  // ==========================================
  // TOAST
  // ==========================================
  async mostrarToast(mensaje: string, color: string = 'primary') {
    const toast = await this.toastController.create({
      message: mensaje,
      duration: 3000,
      color: color,
      position: 'bottom'
    });
    await toast.present();
  }

  // ==========================================
  // PREDICCIÓN POR FERIADO
  // ==========================================

  // Domingo de Pascua (algoritmo de Gauss/Computus gregoriano) para calcular los feriados
  // movibles (Carnaval cae 48/47 días antes; Semana Santa en torno a Viernes Santo).
  private pascua(anio: number): Date {
    const a = anio % 19;
    const b = Math.floor(anio / 100);
    const c = anio % 100;
    const d = Math.floor(b / 4);
    const e = b % 4;
    const f = Math.floor((b + 8) / 25);
    const g = Math.floor((b - f + 1) / 3);
    const h = (19 * a + b - d - g + 15) % 30;
    const i = Math.floor(c / 4);
    const k = c % 4;
    const l = (32 + 2 * e + 2 * i - h - k) % 7;
    const m = Math.floor((a + 11 * h + 22 * l) / 451);
    const mes = Math.floor((h + l - 7 * m + 114) / 31);
    const dia = ((h + l - 7 * m + 114) % 31) + 1;
    return new Date(anio, mes - 1, dia);
  }

  private fmtFecha(d: Date): string {
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${d.getFullYear()}-${mm}-${dd}`;
  }

  // Devuelve la ventana de fechas a predecir para un feriado y año. Se añade ±1 día de contexto
  // (el "puente") para que la gráfica muestre la tendencia alrededor del feriado.
  private ventanaFeriado(id: string, anio: number): { inicio: string; fin: string; oficialIni: Date; oficialFin: Date } | null {
    const cat = this.FERIADOS_CAT.find(f => f.id === id);
    if (!cat) return null;

    let oficialIni: Date;
    let oficialFin: Date;
    if (cat.tipo === 'pascua') {
      const p = this.pascua(anio);
      oficialIni = new Date(p); oficialIni.setDate(p.getDate() + cat.ini);
      oficialFin = new Date(p); oficialFin.setDate(p.getDate() + cat.fin);
    } else {
      oficialIni = new Date(anio, cat.mes - 1, cat.dia);
      oficialFin = new Date(anio, cat.mes - 1, cat.dia + cat.dur - 1);
    }

    const inicio = new Date(oficialIni); inicio.setDate(oficialIni.getDate() - 1);
    const fin = new Date(oficialFin); fin.setDate(oficialFin.getDate() + 1);
    return { inicio: this.fmtFecha(inicio), fin: this.fmtFecha(fin), oficialIni, oficialFin };
  }

  // Texto informativo del feriado seleccionado (nombre, rango de fechas oficial y si tiene datos).
  get feriadoInfo(): { nombre: string; conDatos: boolean; rangoTexto: string } | null {
    const cat = this.FERIADOS_CAT.find(f => f.id === this.feriadoSel);
    const v = this.ventanaFeriado(this.feriadoSel, this.anioSel);
    if (!cat || !v) return null;

    const meses = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
    const txt = (d: Date) => `${d.getDate()} ${meses[d.getMonth()]}`;
    const rangoTexto = v.oficialIni.getTime() === v.oficialFin.getTime()
      ? txt(v.oficialIni)
      : `${txt(v.oficialIni)} al ${txt(v.oficialFin)}`;
    return { nombre: cat.nombre, conDatos: cat.conDatos, rangoTexto };
  }

  async predecirFeriado() {
    const cat = this.FERIADOS_CAT.find(f => f.id === this.feriadoSel);
    const v = this.ventanaFeriado(this.feriadoSel, this.anioSel);
    if (!cat || !v) {
      this.mostrarToast('Seleccione un feriado válido.', 'warning');
      return;
    }

    this.prediciendoFeriado = true;
    try {
      const response: any = await this.prediccionService
        .predecirRango(v.inicio, v.fin)
        .toPromise();

      this.resultadoFeriado = response;
      this.resultadoFeriadoNombre = cat.nombre;
      this.resultadoFeriadoAnio = this.anioSel;

      const dias: any[] = response?.predicciones_diarias || [];
      const valores = dias.map((d: any) => d.ocupacion_predicha);
      this.feriadoMin = valores.length ? Math.round(Math.min(...valores)) : 0;
      this.feriadoMax = valores.length ? Math.round(Math.max(...valores)) : 0;

      setTimeout(() => this.crearGraficoFeriado(), 100);
      this.mostrarToast(`Predicción de ${cat.nombre} ${this.anioSel} generada`, 'success');
    } catch (error) {
      console.error('Error prediciendo feriado:', error);
      this.mostrarToast('Error al generar la predicción. Verifique que exista un modelo entrenado.', 'danger');
    } finally {
      this.prediciendoFeriado = false;
    }
  }

  crearGraficoFeriado() {
    const ctx = document.getElementById('chartFeriado') as HTMLCanvasElement;
    if (!ctx || !this.resultadoFeriado) return;

    if (this.chartFeriado) this.chartFeriado.destroy();

    const dias: any[] = this.resultadoFeriado.predicciones_diarias || [];
    const etiqueta = (d: any) => {
      const f = d.fecha ? `${d.fecha.slice(8, 10)}/${d.fecha.slice(5, 7)}` : '';
      return `${d.dia_semana || ''} ${f}`.trim();
    };

    this.chartFeriado = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: dias.map(etiqueta),
        datasets: [{
          label: 'Ocupación esperada (%)',
          data: dias.map((d: any) => d.ocupacion_predicha),
          backgroundColor: 'rgba(42, 111, 151, 0.85)',
          borderColor: 'rgba(42, 111, 151, 1)',
          borderWidth: 2,
          borderRadius: 6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          title: {
            display: true,
            text: `Ocupación esperada — ${this.resultadoFeriadoNombre} ${this.resultadoFeriadoAnio}`,
            color: TITULO_CHART,
            font: { size: 14, weight: 'bold' }
          }
        },
        scales: {
          x: { ticks: { color: EJE_TICK }, grid: { color: EJE_GRID } },
          y: {
            beginAtZero: true,
            max: 100,
            title: { display: true, text: 'Ocupación (%)', color: EJE_TICK },
            ticks: { color: EJE_TICK }, grid: { color: EJE_GRID }
          }
        }
      }
    });
  }

  // ==========================================
  // MÉTRICAS Y MODELOS
  // ==========================================
  async cargarMetricas() {
    try {
      const response: any = await this.etlService.getMetricas().toPromise();
      this.metricas = response;

      // /metricas del microservicio NO trae 'comparacion' ni 'mejor_modelo' (eso solo viene en la
      // respuesta de POST /entrenar). Trae: entrenado (hay modelo en uso, aunque se esté
      // reentrenando otro en segundo plano), estado_modelo, modelo_usado y metricas por algoritmo.
      if (response?.entrenado) {
        this.modeloListo = true;
        this.modeloUsado = response.modelo_usado || 'Modelo listo';
        this.comparacion = this.armarComparacion(response.metricas, response.modelo_usado);
        if (this.comparacion) {
          setTimeout(() => this.crearGraficoComparacion(), 100);
        }
      }
    } catch (error) {
      console.error('Error cargando métricas:', error);
    }
  }

  // Arma 'comparacion' con el mismo formato que devuelve POST /entrenar (ver generar_comparacion en
  // modelo.py del microservicio) a partir de las métricas por algoritmo de /metricas, para que el
  // panel y el gráfico de comparación se vean al abrir la página y no solo justo después de
  // entrenar. Devuelve null si no hay métricas (p. ej. un modelo antiguo sin modelo_ganador.json).
  private armarComparacion(metricas: any, ganador: string): any {
    const rf = metricas?.['Random Forest'];
    if (!rf) return null;
    const xgboost = metricas['XGBoost'] || {};
    const prophet = metricas['Prophet'] || null;
    const precisiones = [rf, xgboost, prophet].filter(m => m).map(m => m.precision || 0);
    return {
      ganador,
      random_forest: rf,
      xgboost,
      prophet,
      diferencia_precision: Math.round((Math.max(...precisiones) - Math.min(...precisiones)) * 100) / 100
    };
  }

  async entrenarModelo() {
    this.entrenando = true;
    try {
      const response: any = await this.prediccionService.entrenarModelo().toPromise();

      this.metricas = response.metricas;
      this.comparacion = response.comparacion;
      this.modeloListo = true;
      this.modeloUsado = response.mejor_modelo || 'Modelo entrenado';

      setTimeout(() => this.crearGraficoComparacion(), 100);

      this.mostrarToast('Entrenamiento completado correctamente', 'success');
    } catch (error) {
      console.error('Error entrenando:', error);
      this.mostrarToast('Error al entrenar los modelos de predicción', 'danger');
    } finally {
      this.entrenando = false;
    }
  }

  // ==========================================
  // GRÁFICO COMPARACIÓN
  // ==========================================
  crearGraficoComparacion() {
    const ctx = document.getElementById('chartComparacion') as HTMLCanvasElement;
    if (!ctx || !this.comparacion) return;

    if (this.chartComparacion) this.chartComparacion.destroy();

    const rf = this.comparacion.random_forest;
    const xgb = this.comparacion.xgboost;
    const prophet = this.comparacion.prophet;

    const datasets: any[] = [
      {
        label: 'Random Forest',
        data: [rf.precision, rf.r2 * 100, rf.mae],
        backgroundColor: 'rgba(42, 111, 151, 0.85)',
        borderColor: 'rgba(42, 111, 151, 1)',
        borderWidth: 2
      },
      {
        label: 'XGBoost',
        data: [xgb.precision, xgb.r2 * 100, xgb.mae],
        backgroundColor: 'rgba(245, 158, 11, 0.8)',
        borderColor: 'rgba(245, 158, 11, 1)',
        borderWidth: 2
      }
    ];
    if (prophet) {
      datasets.push({
        label: 'Prophet',
        data: [prophet.precision, prophet.r2 * 100, prophet.mae],
        backgroundColor: 'rgba(16, 185, 129, 0.8)',
        borderColor: 'rgba(16, 185, 129, 1)',
        borderWidth: 2
      });
    }

    this.chartComparacion = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: ['Precisión (%)', 'R² Score', 'MAE'],
        datasets
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'bottom', labels: { color: LEYENDA } },
          title: {
            display: true,
            text: 'Comparación: Random Forest vs XGBoost vs Prophet',
            color: TITULO_CHART,
            font: { size: 14, weight: 'bold' }
          }
        },
        scales: {
          x: { ticks: { color: EJE_TICK }, grid: { color: EJE_GRID } },
          y: { beginAtZero: true, ticks: { color: EJE_TICK }, grid: { color: EJE_GRID } }
        }
      }
    });
  }

  // ==========================================
  // PREDICCIÓN SIMULADOR (1 DÍA)
  // ==========================================
  async predecir() {
    this.prediciendo = true;
    try {
      // El simulador simplificado solo pide la fecha y la temporada; el backend completa los
      // demás factores (check-in, tarifa, clima) con valores típicos de esa temporada.
      const datos = {
        fecha_objetivo: this.fechaObjetivo,
        temporada: this.temporada
      };

      const response: any = await this.prediccionService.predecir(datos).toPromise();
      this.prediccion = response;
      this.prediccionCargada = true;

      setTimeout(() => this.crearGraficoPrediccion(), 100);
      this.mostrarToast('Predicción calculada correctamente', 'success');
    } catch (error) {
      console.error('Error prediciendo:', error);
      this.mostrarToast('Error al generar predicción. Verifique que exista un modelo entrenado.', 'danger');
    } finally {
      this.prediciendo = false;
    }
  }

  // ==========================================
  // GRÁFICO PREDICCIÓN
  // ==========================================
  crearGraficoPrediccion() {
    const ctx = document.getElementById('chartPrediccion') as HTMLCanvasElement;
    if (!ctx || !this.prediccion) return;

    if (this.chartPrediccion) this.chartPrediccion.destroy();

    const valorPredicho = this.prediccion.ocupacion_predicha;
    const minimo = this.prediccion.rango_prediccion?.minimo || valorPredicho - 5;
    const maximo = this.prediccion.rango_prediccion?.maximo || valorPredicho + 5;

    this.chartPrediccion = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: ['Valor Predicho', 'Rango Mínimo', 'Rango Máximo'],
        datasets: [{
          label: 'Ocupación (%)',
          data: [valorPredicho, minimo, maximo],
          backgroundColor: [
            'rgba(16, 185, 129, 0.8)',
            'rgba(245, 158, 11, 0.6)',
            'rgba(245, 158, 11, 0.6)'
          ],
          borderColor: [
            'rgba(16, 185, 129, 1)',
            'rgba(245, 158, 11, 1)',
            'rgba(245, 158, 11, 1)'
          ],
          borderWidth: 2
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'bottom', labels: { color: LEYENDA } },
          title: {
            display: true,
            text: `Predicción con ${this.prediccion.modelo || 'Modelo ML'}`,
            color: TITULO_CHART,
            font: { size: 14, weight: 'bold' }
          }
        },
        scales: {
          x: { ticks: { color: EJE_TICK }, grid: { color: EJE_GRID } },
          y: {
            beginAtZero: true,
            max: 100,
            title: { display: true, text: 'Ocupación (%)', color: EJE_TICK },
            ticks: { color: EJE_TICK }, grid: { color: EJE_GRID }
          }
        }
      }
    });
  }

  // ==========================================
  // PREDICCIÓN POR RANGO (INVESTIGADOR)
  // ==========================================
  seleccionarRangoRapido(dias: number) {
    const hoy = new Date();
    const fin = new Date();
    fin.setDate(hoy.getDate() + dias);

    this.fechaInicioRango = hoy.toISOString().split('T')[0];
    this.fechaFinRango = fin.toISOString().split('T')[0];
    this.predecirRango();
  }

  onFechaRangoChange() {
    if (this.fechaInicioRango && this.fechaFinRango) {
      const start = new Date(this.fechaInicioRango);
      const end = new Date(this.fechaFinRango);
      if (start <= end) {
        this.predecirRango();
      }
    }
  }

  async predecirRango() {
    if (!this.fechaInicioRango || !this.fechaFinRango) {
      this.mostrarToast('Por favor seleccione una fecha de inicio y una fecha de fin.', 'warning');
      return;
    }

    this.calculandoRango = true;
    try {
      const response: any = await this.prediccionService
        .predecirRango(this.fechaInicioRango, this.fechaFinRango)
        .toPromise();

      this.resultadoRango = response;

      setTimeout(() => this.crearGraficoRango(), 100);
      this.mostrarToast(`Proyección para ${response.total_dias} días generada`, 'success');
    } catch (error) {
      console.error('Error al proyectar rango:', error);
      this.mostrarToast('Error al proyectar el rango de fechas.', 'danger');
    } finally {
      this.calculandoRango = false;
    }
  }

  // ==========================================
  // GRÁFICO RANGO
  // ==========================================
  crearGraficoRango() {
    const ctx = document.getElementById('chartRango') as HTMLCanvasElement;
    if (!ctx || !this.resultadoRango) return;

    if (this.chartRango) this.chartRango.destroy();

    const predicciones: any[] = this.resultadoRango.predicciones_diarias || [];

    this.chartRango = new Chart(ctx, {
      type: 'line',
      data: {
        labels: predicciones.map((p: any) => p.fecha),
        datasets: [{
          label: 'Ocupación Predicha (%)',
          data: predicciones.map((p: any) => p.ocupacion_predicha),
          borderColor: 'rgba(42, 111, 151, 1)',
          backgroundColor: 'rgba(42, 111, 151, 0.12)',
          tension: 0.35,
          fill: true,
          pointRadius: 4,
          pointBackgroundColor: 'rgba(142, 68, 173, 1)'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'bottom', labels: { color: LEYENDA } },
          title: {
            display: true,
            text: `Tendencia de Ocupación (${this.resultadoRango.fecha_inicio} a ${this.resultadoRango.fecha_fin})`,
            color: TITULO_CHART,
            font: { size: 13, weight: 'bold' }
          }
        },
        scales: {
          x: { ticks: { color: EJE_TICK }, grid: { color: EJE_GRID } },
          y: {
            beginAtZero: true,
            max: 100,
            title: { display: true, text: 'Ocupación (%)', color: EJE_TICK },
            ticks: { color: EJE_TICK }, grid: { color: EJE_GRID }
          }
        }
      }
    });

    // Gráficos secundarios
    this.crearGraficoDiaSemana();
    this.crearGraficoTemporada();
  }

  // ==========================================
  // GRÁFICO DÍA DE SEMANA
  // ==========================================
  crearGraficoDiaSemana() {
    const ctx = document.getElementById('chartDiaSemana') as HTMLCanvasElement;
    if (!ctx || !this.resultadoRango?.promedios_dia_semana) return;

    if (this.chartDiaSemana) this.chartDiaSemana.destroy();

    const dataMap = this.resultadoRango.promedios_dia_semana;
    const labels = Object.keys(dataMap);
    const values = Object.values(dataMap);

    this.chartDiaSemana = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [{
          label: 'Promedio Ocupación (%)',
          data: values,
          backgroundColor: 'rgba(52, 152, 219, 0.8)',
          borderColor: 'rgba(52, 152, 219, 1)',
          borderWidth: 2
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          title: { display: true, text: 'Ocupación por Día de Semana', color: TITULO_CHART, font: { size: 12, weight: 'bold' } }
        },
        scales: {
          x: { ticks: { color: EJE_TICK }, grid: { color: EJE_GRID } },
          y: { beginAtZero: true, max: 100, ticks: { color: EJE_TICK }, grid: { color: EJE_GRID } }
        }
      }
    });
  }

  // ==========================================
  // GRÁFICO TEMPORADA
  // ==========================================
  crearGraficoTemporada() {
    const ctx = document.getElementById('chartTemporada') as HTMLCanvasElement;
    if (!ctx || !this.resultadoRango?.promedios_temporada) return;

    if (this.chartTemporada) this.chartTemporada.destroy();

    const dataMap = this.resultadoRango.promedios_temporada;
    const labels = Object.keys(dataMap);
    const values = Object.values(dataMap);

    this.chartTemporada = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: labels,
        datasets: [{
          data: values,
          backgroundColor: [
            'rgba(231, 76, 60, 0.8)',
            'rgba(241, 196, 15, 0.8)',
            'rgba(46, 204, 113, 0.8)'
          ],
          borderWidth: 2
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'bottom', labels: { color: LEYENDA } },
          title: { display: true, text: 'Comparación por Temporada', color: TITULO_CHART, font: { size: 12, weight: 'bold' } }
        }
      }
    });
  }

  // ==========================================
  // PREDICCIONES HISTÓRICAS (ADMIN)
  // ==========================================
  async cargarPrediccionesHistoricas() {
    this.cargandoHistoricas = true;
    try {
      const response: any = await this.etlService.getHistoricalPredictions().toPromise();

      this.prediccionesHistoricas = response.predicciones || [];
      this.precisionPromedio = response.precision_promedio || 0;
      this.errorPromedio = response.error_promedio || 0;
      this.totalRegistrosAnalizados = response.total_registros || 0;
      this.modeloUsado = response.modelo_usado || 'Modelo histórico';


      setTimeout(() => this.crearGraficoHistoricas(), 100);
      this.mostrarToast(`${response.total_registros} registros históricos validados`, 'success');
    } catch (error) {
      console.error('Error cargando predicciones históricas:', error);
      this.mostrarToast('Error cargando predicciones históricas. Entrene el modelo primero.', 'warning');
    } finally {
      this.cargandoHistoricas = false;
    }
  }

  // ==========================================
  // GRÁFICO HISTÓRICAS
  // ==========================================
  crearGraficoHistoricas() {
    const ctx = document.getElementById('chartHistoricas') as HTMLCanvasElement;
    if (!ctx || this.prediccionesHistoricas.length === 0) return;

    if (this.chartHistoricas) this.chartHistoricas.destroy();

    const sorted = [...this.prediccionesHistoricas].sort((a, b) =>
      new Date(a.fecha).getTime() - new Date(b.fecha).getTime()
    );

    this.chartHistoricas = new Chart(ctx, {
      type: 'line',
      data: {
        labels: sorted.map((p: any) => p.fecha),
        datasets: [
          {
            label: 'Valor Real (%)',
            data: sorted.map((p: any) => p.valor_real),
            borderColor: 'rgba(41, 128, 185, 1)',
            backgroundColor: 'rgba(41, 128, 185, 0.1)',
            tension: 0.4,
            fill: false,
            pointRadius: 4,
            pointBackgroundColor: 'rgba(41, 128, 185, 1)'
          },
          {
            label: 'Valor Predicho (%)',
            data: sorted.map((p: any) => p.valor_predicho),
            borderColor: 'rgba(46, 204, 113, 1)',
            backgroundColor: 'rgba(46, 204, 113, 0.1)',
            tension: 0.4,
            fill: false,
            pointRadius: 4,
            pointBackgroundColor: 'rgba(46, 204, 113, 1)'
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'bottom', labels: { color: LEYENDA } },
          title: {
            display: true,
            text: `Real vs Predicho (Precisión: ${this.precisionPromedio}%)`,
            color: TITULO_CHART,
            font: { size: 13, weight: 'bold' }
          }
        },
        scales: {
          x: { ticks: { color: EJE_TICK }, grid: { color: EJE_GRID } },
          y: {
            beginAtZero: true,
            max: 100,
            title: { display: true, text: 'Ocupación (%)', color: EJE_TICK },
            ticks: { color: EJE_TICK }, grid: { color: EJE_GRID }
          }
        }
      }
    });
  }

  // ==========================================
  // MÉTODOS DE UTILIDAD
  // ==========================================
  getPrecisionClass(precision: number): string {
    if (precision >= 90) return 'high';
    if (precision >= 70) return 'medium';
    return 'low';
  }

  getOcupacionClass(valor: number): string {
    if (valor >= 80) return 'alta';
    if (valor >= 50) return 'media';
    return 'baja';
  }

  getOcupacionLabel(valor: number): string {
    if (valor >= 80) return 'Alta';
    if (valor >= 50) return 'Media';
    return 'Baja';
  }
}