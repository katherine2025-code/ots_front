import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HeaderComponent } from 'src/app/shared/components/header/header.component';
import { FormsModule } from '@angular/forms';
import { IonicModule, ToastController } from '@ionic/angular';
import { Chart, registerables } from 'chart.js';
import { EtlService } from 'src/app/core/services/etl.service';
import { AuthService } from 'src/app/core/services/auth.service';
import { PrediccionService } from 'src/app/core/services/prediccion.service';

Chart.register(...registerables);

// Colores para que los gráficos se lean sobre el panel oscuro del dashboard.
const EJE_TICK = '#8ea6c8';
const EJE_GRID = 'rgba(255,255,255,0.06)';
const LEYENDA = '#cbd5e1';
const TITULO_CHART = '#e8eef7';

@Component({
  selector: 'app-predicciones',
  templateUrl: './predicciones.page.html',
  styleUrls: ['./predicciones.page.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule, HeaderComponent]
})
export class PrediccionesPage implements OnInit, OnDestroy {
  // ==========================================
  // MODO DE PREDICCIÓN
  // ==========================================
  modoPrediccion: 'rango' = 'rango';

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
  // Métricas de la validación histórica. `precisionPromedio` es la media de la
  // precisión registro a registro; `precisionModelo` es la métrica oficial del
  // entrenamiento (la misma que reporta la comparación de modelos) calculada
  // sobre el 30% de prueba que el modelo no vio.
  precisionPromedio: number = 0;
  precisionModelo: number = 0;
  errorPromedio: number = 0;
  mape: number = 0;
  rmseModelo: number = 0;
  maeModelo: number = 0;
  r2Modelo: number = 0;
  conjuntoEvaluado: string = '';
  totalRegistrosAnalizados: number = 0;
  registrosHistoricos: number = 0;
  fechaEntrenamiento: string | null = null;

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
  chartHistograma: any = null;
  chartHistErrores: any = null;
  chartHistPrecision: any = null;
  chartDispersion: any = null;

  // ==========================================
  // RESULTADOS DE PREDICCIONES (SOLO ADMINISTRADOR)
  // ==========================================
  resultadosPredicciones: any[] = [];
  cargandoResultados: boolean = false;

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

  get isInvestigador(): boolean {
    return this.authService.isInvestigador();
  }

  // Resultados y validación histórica: los consultan en solo lectura el Super
  // Administrador, el Administrador y el Investigador.
  get puedeVerResultados(): boolean {
    return this.isAdmin || this.isInvestigador;
  }

  // Solo el Super Administrador puede validar/descartar y entrenar. Los demás
  // roles consultan los resultados sin modificarlos.
  get puedeValidar(): boolean {
    return this.isSuperAdmin;
  }

  // Generar proyecciones: Super Administrador e Investigador.
  get puedeGenerar(): boolean {
    return this.isSuperAdmin || this.isInvestigador;
  }

  // ==========================================
  // NGONINIT
  // ==========================================
  ngOnInit() {
    // Siempre modo proyección por rango
    this.modoPrediccion = 'rango';

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
    if (this.puedeVerResultados) {
      // El Administrador solo consulta; el Investigador y el Super Admin además
      // pueden generar proyecciones. En los tres casos los resultados ya
      // generados y la validación histórica se cargan solos, en solo lectura.
      this.cargarResultados();
      this.cargarPrediccionesHistoricas(true);
    }
  }

  ngOnDestroy() {
    const charts = [
      this.chartComparacion, this.chartPrediccion, this.chartRango,
      this.chartDiaSemana, this.chartTemporada, this.chartHistoricas,
      this.chartHistograma, this.chartHistErrores, this.chartHistPrecision,
      this.chartDispersion
    ];
    charts.forEach(chart => { try { chart?.destroy(); } catch { /* ya destruido */ } });
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
  // MÉTRICAS Y MODELOS
  // ==========================================
  async cargarMetricas() {
    try {
      const response: any = await this.etlService.getMetricas().toPromise();
      this.metricas = response;

      if (response?.entrenado) {
        this.modeloListo = true;
        this.modeloUsado = response.modelo_usado || 'Modelo listo';
        this.registrosHistoricos = response.registros_historicos || 0;
        this.fechaEntrenamiento = response.fecha_entrenamiento || null;
        this.comparacion = this.armarComparacion(response.metricas, response.modelo_usado);
        if (this.comparacion) {
          setTimeout(() => this.crearGraficoComparacion(), 100);
        }
        console.log('📊 Métricas cargadas:', this.metricas);
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
      console.log('🧠 Entrenamiento completado:', response);

      this.metricas = response.metricas;
      this.comparacion = response.comparacion;
      this.modeloListo = true;
      this.modeloUsado = response.mejor_modelo || 'Modelo entrenado';
      this.registrosHistoricos = response.registros_historicos || this.registrosHistoricos;
      this.fechaEntrenamiento = response.fecha_entrenamiento || new Date().toISOString();

      setTimeout(() => this.crearGraficoComparacion(), 100);

      const precisionGanador = this.comparacion?.ganador === 'Random Forest' 
        ? this.comparacion?.random_forest?.precision 
        : this.comparacion?.ganador === 'XGBoost' 
          ? this.comparacion?.xgboost?.precision 
          : this.comparacion?.prophet?.precision;

      this.mostrarToast(`✅ Entrenamiento completado. Modelo seleccionado: ${response.mejor_modelo} (${precisionGanador || 0}% de precisión)`, 'success');
    } catch (error) {
      console.error('Error entrenando:', error);
      this.mostrarToast('❌ Error al entrenar los modelos de predicción', 'danger');
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
        backgroundColor: 'rgba(102, 126, 234, 0.8)',
        borderColor: 'rgba(102, 126, 234, 1)',
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
      this.mostrarToast('✅ Predicción calculada correctamente', 'success');
    } catch (error) {
      console.error('Error prediciendo:', error);
      this.mostrarToast('❌ Error al generar predicción. Verifique que exista un modelo entrenado.', 'danger');
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
  // PREDICCIÓN POR RANGO (SUPER ADMIN E INVESTIGADOR)
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
      this.mostrarToast('⚠️ Por favor seleccione una fecha de inicio y una fecha de fin.', 'warning');
      return;
    }

    this.calculandoRango = true;
    try {
      const response: any = await this.prediccionService
        .predecirRango(this.fechaInicioRango, this.fechaFinRango)
        .toPromise();

      this.resultadoRango = response;
      console.log('📊 Proyección por rango:', response);

      setTimeout(() => {
        this.crearGraficoRango();
        this.crearHistogramaOcupacion();
      }, 100);
      // La proyección ya quedó guardada por el backend: refrescar la lista de
      // resultados para que Admin e Investigador la vean sin recargar la página.
      if (this.puedeVerResultados) this.cargarResultados();
      this.mostrarToast(`✅ Proyección para ${response.total_dias} días generada`, 'success');
    } catch (error) {
      console.error('Error al proyectar rango:', error);
      this.mostrarToast('❌ Error al proyectar el rango de fechas.', 'danger');
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
          borderColor: 'rgba(63, 214, 196, 1)',
          backgroundColor: 'rgba(63, 214, 196, 0.18)',
          tension: 0.4,
          fill: true,
          pointRadius: 4,
          pointBackgroundColor: 'rgba(63, 214, 196, 1)',
          pointBorderColor: '#fff',
          pointBorderWidth: 2
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'bottom', labels: { color: LEYENDA } },
          title: {
            display: true,
            text: `Tendencia Diaria de Ocupación Hotelera (${this.resultadoRango.fecha_inicio} a ${this.resultadoRango.fecha_fin})`,
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
          backgroundColor: 'rgba(63, 214, 196, 0.85)',
          borderColor: 'rgba(63, 214, 196, 1)',
          borderWidth: 2,
          borderRadius: 6
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
      type: 'bar',
      data: {
        labels: labels,
        datasets: [{
          label: 'Promedio Ocupación (%)',
          data: values,
          backgroundColor: [
            'rgba(231, 76, 60, 0.85)',
            'rgba(241, 196, 15, 0.85)',
            'rgba(46, 204, 113, 0.85)'
          ],
          borderColor: [
            'rgba(231, 76, 60, 1)',
            'rgba(241, 196, 15, 1)',
            'rgba(46, 204, 113, 1)'
          ],
          borderWidth: 2
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          title: { display: true, text: 'Ocupación Promedio por Temporada', color: TITULO_CHART, font: { size: 12, weight: 'bold' } }
        },
        scales: {
          x: { ticks: { color: EJE_TICK }, grid: { color: EJE_GRID } },
          y: { beginAtZero: true, max: 100, ticks: { color: EJE_TICK }, grid: { color: EJE_GRID } }
        }
      }
    });
  }

  crearHistogramaOcupacion() {
    const ctx = document.getElementById('chartHistograma') as HTMLCanvasElement;
    if (!ctx || !this.resultadoRango?.predicciones_diarias) return;

    if (this.chartHistograma) this.chartHistograma.destroy();

    const predicciones = this.resultadoRango.predicciones_diarias;
    const rangos = [
      { label: '0 - 40%', min: 0, max: 40 },
      { label: '40 - 60%', min: 40, max: 60 },
      { label: '60 - 80%', min: 60, max: 80 },
      { label: '80 - 100%', min: 80, max: 100 }
    ];

    const frecuencias = rangos.map(rango => {
      return predicciones.filter((p: any) => {
        const val = p.ocupacion_predicha;
        if (rango.max === 100) return val >= rango.min && val <= rango.max;
        return val >= rango.min && val < rango.max;
      }).length;
    });

    this.chartHistograma = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: rangos.map(r => r.label),
        datasets: [{
          label: 'Número de días',
          data: frecuencias,
          backgroundColor: [
            'rgba(239, 68, 68, 0.85)',
            'rgba(251, 146, 60, 0.85)',
            'rgba(250, 204, 21, 0.85)',
            'rgba(34, 197, 94, 0.85)'
          ],
          borderColor: [
            'rgba(239, 68, 68, 1)',
            'rgba(251, 146, 60, 1)',
            'rgba(250, 204, 21, 1)',
            'rgba(34, 197, 94, 1)'
          ],
          borderWidth: 2
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          title: { display: true, text: 'Histograma de Distribución de Ocupación', color: TITULO_CHART, font: { size: 12, weight: 'bold' } }
        },
        scales: {
          x: { ticks: { color: EJE_TICK }, grid: { color: EJE_GRID } },
          y: { beginAtZero: true, ticks: { color: EJE_TICK, stepSize: 1 }, grid: { color: EJE_GRID } }
        }
      }
    });
  }

  // ==========================================
  // PREDICCIONES HISTÓRICAS (SOLO LECTURA)
  // ==========================================
  async cargarPrediccionesHistoricas(silencioso: boolean = false) {
    this.cargandoHistoricas = true;
    try {
      const response: any = await this.etlService.getHistoricalPredictions().toPromise();

      this.prediccionesHistoricas = response.predicciones || [];
      this.precisionPromedio = response.precision_promedio || 0;
      this.errorPromedio = response.error_promedio || 0;
      this.mape = response.mape ?? 0;
      this.totalRegistrosAnalizados = response.total_registros || 0;
      this.modeloUsado = response.modelo_usado || this.modeloUsado;
      this.precisionModelo = response.precision_modelo ?? this.precisionPromedio;
      this.rmseModelo = response.rmse ?? 0;
      this.maeModelo = response.mae ?? 0;
      this.r2Modelo = response.r2 ?? 0;
      this.conjuntoEvaluado = response.conjunto_evaluado || 'completo';

      console.log('📊 Predicciones históricas:', response);

      setTimeout(() => {
        this.crearGraficoHistoricas();
        this.crearHistogramaErrores();
        this.crearHistogramaPrecision();
        this.crearDispersionRealPredicho();
      }, 100);

      if (!silencioso) {
        const detalle = this.conjuntoEvaluado === 'prueba'
          ? `${response.total_registros} registros del 30% de prueba`
          : `${response.total_registros} registros históricos`;
        this.mostrarToast(`✅ Validación actualizada: ${detalle}`, 'success');
      }
    } catch (error) {
      console.error('Error cargando predicciones históricas:', error);
      if (!silencioso) {
        this.mostrarToast('⚠️ No se pudo cargar la validación histórica. Entrene el modelo primero.', 'warning');
      }
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
            text: `Real vs Predicho · Precisión del modelo: ${this.precisionModelo}%`,
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
  // HISTOGRAMA DE ERRORES ABSOLUTOS
  // Muestra cuántos registros del conjunto de prueba cayeron en cada rango de
  // error (|real - predicho|). Es la lectura más directa de qué tan lejos
  // suele quedar la predicción del valor real.
  // ==========================================
  crearHistogramaErrores() {
    const ctx = document.getElementById('chartHistErrores') as HTMLCanvasElement;
    if (!ctx || this.prediccionesHistoricas.length === 0) return;

    if (this.chartHistErrores) this.chartHistErrores.destroy();

    const rangos = [
      { label: '0 - 5%', min: 0, max: 5 },
      { label: '5 - 10%', min: 5, max: 10 },
      { label: '10 - 15%', min: 10, max: 15 },
      { label: '15 - 20%', min: 15, max: 20 },
      { label: '20 - 30%', min: 20, max: 30 },
      { label: '30% o más', min: 30, max: Infinity }
    ];

    const frecuencias = rangos.map(rango =>
      this.prediccionesHistoricas.filter((p: any) => {
        const error = Math.abs(Number(p.error) || 0);
        return error >= rango.min && error < rango.max;
      }).length
    );

    this.chartHistErrores = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: rangos.map(r => r.label),
        datasets: [{
          label: 'Número de registros',
          data: frecuencias,
          backgroundColor: [
            'rgba(34, 197, 94, 0.8)',
            'rgba(132, 204, 22, 0.8)',
            'rgba(250, 204, 21, 0.8)',
            'rgba(251, 146, 60, 0.8)',
            'rgba(249, 115, 22, 0.8)',
            'rgba(239, 68, 68, 0.8)'
          ],
          borderColor: [
            'rgba(34, 197, 94, 1)',
            'rgba(132, 204, 22, 1)',
            'rgba(250, 204, 21, 1)',
            'rgba(251, 146, 60, 1)',
            'rgba(249, 115, 22, 1)',
            'rgba(239, 68, 68, 1)'
          ],
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
            text: 'Histograma de Errores Absolutos (Real vs Predicho)',
            color: TITULO_CHART,
            font: { size: 13, weight: 'bold' }
          }
        },
        scales: {
          x: {
            title: { display: true, text: 'Rango de error absoluto', color: EJE_TICK },
            ticks: { color: EJE_TICK }, grid: { color: EJE_GRID }
          },
          y: {
            beginAtZero: true,
            title: { display: true, text: 'Número de registros', color: EJE_TICK },
            ticks: { color: EJE_TICK, stepSize: 1 }, grid: { color: EJE_GRID }
          }
        }
      }
    });
  }

  // ==========================================
  // HISTOGRAMA DE PRECISIÓN
  // Distribución de la precisión registro a registro (100% = predicción
  // exacta). Permite ver si el modelo es consistente o si acierta mucho en
  // unos días y falla en otros.
  // ==========================================
  crearHistogramaPrecision() {
    const ctx = document.getElementById('chartHistPrecision') as HTMLCanvasElement;
    if (!ctx || this.prediccionesHistoricas.length === 0) return;

    if (this.chartHistPrecision) this.chartHistPrecision.destroy();

    const rangos = [
      { label: 'Menor a 0%', min: -Infinity, max: 0 },
      { label: '0 - 40%', min: 0, max: 40 },
      { label: '40 - 60%', min: 40, max: 60 },
      { label: '60 - 70%', min: 60, max: 70 },
      { label: '70 - 80%', min: 70, max: 80 },
      { label: '80 - 90%', min: 80, max: 90 },
      { label: '90 - 100%', min: 90, max: 100.01 }
    ];

    const frecuencias = rangos.map(rango =>
      this.prediccionesHistoricas.filter((p: any) => {
        const precision = Number(p.precision) || 0;
        return precision >= rango.min && precision < rango.max;
      }).length
    );

    this.chartHistPrecision = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: rangos.map(r => r.label),
        datasets: [{
          label: 'Número de registros',
          data: frecuencias,
          backgroundColor: [
            'rgba(127, 29, 29, 0.9)',
            'rgba(239, 68, 68, 0.8)',
            'rgba(249, 115, 22, 0.8)',
            'rgba(250, 204, 21, 0.8)',
            'rgba(132, 204, 22, 0.8)',
            'rgba(34, 197, 94, 0.8)',
            'rgba(16, 185, 129, 0.9)'
          ],
          borderColor: [
            'rgba(127, 29, 29, 1)',
            'rgba(239, 68, 68, 1)',
            'rgba(249, 115, 22, 1)',
            'rgba(250, 204, 21, 1)',
            'rgba(132, 204, 22, 1)',
            'rgba(34, 197, 94, 1)',
            'rgba(16, 185, 129, 1)'
          ],
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
            text: 'Distribución de la Precisión por Registro',
            color: TITULO_CHART,
            font: { size: 13, weight: 'bold' }
          }
        },
        scales: {
          x: {
            title: { display: true, text: 'Rango de precisión', color: EJE_TICK },
            ticks: { color: EJE_TICK }, grid: { color: EJE_GRID }
          },
          y: {
            beginAtZero: true,
            title: { display: true, text: 'Número de registros', color: EJE_TICK },
            ticks: { color: EJE_TICK, stepSize: 1 }, grid: { color: EJE_GRID }
          }
        }
      }
    });
  }

  // ==========================================
  // DISPERSIÓN REAL VS PREDICHO
  // Cada punto es un registro. La línea diagonal representa la predicción
  // perfecta: mientras más cerca estén los puntos de la línea, mejor es el
  // modelo.
  // ==========================================
  crearDispersionRealPredicho() {
    const ctx = document.getElementById('chartDispersion') as HTMLCanvasElement;
    if (!ctx || this.prediccionesHistoricas.length === 0) return;

    if (this.chartDispersion) this.chartDispersion.destroy();

    const puntos = this.prediccionesHistoricas.map((p: any) => ({
      x: Number(p.valor_real) || 0,
      y: Number(p.valor_predicho) || 0,
      fecha: p.fecha
    }));

    const valores: number[] = [];
    puntos.forEach((p: any) => { valores.push(p.x, p.y); });
    const minimo = Math.max(0, Math.floor(Math.min(...valores, 100) / 10) * 10 - 10);
    const maximo = Math.min(100, Math.ceil(Math.max(...valores, 0) / 10) * 10 + 10);

    this.chartDispersion = new Chart(ctx, {
      type: 'scatter',
      data: {
        datasets: [
          {
            label: 'Registros evaluados',
            data: puntos,
            backgroundColor: 'rgba(63, 214, 196, 0.75)',
            borderColor: 'rgba(63, 214, 196, 1)',
            pointRadius: 5,
            pointHoverRadius: 7
          },
          {
            label: 'Predicción perfecta (y = x)',
            type: 'line' as any,
            data: [{ x: minimo, y: minimo }, { x: maximo, y: maximo }],
            borderColor: 'rgba(148, 163, 184, 0.9)',
            borderDash: [6, 5],
            borderWidth: 2,
            pointRadius: 0,
            fill: false
          } as any
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'bottom', labels: { color: LEYENDA } },
          title: {
            display: true,
            text: 'Dispersión: Ocupación Real vs Predicha',
            color: TITULO_CHART,
            font: { size: 13, weight: 'bold' }
          },
          tooltip: {
            callbacks: {
              label: (contexto: any) => {
                const p = contexto.raw || {};
                return `Real: ${p.x}% · Predicho: ${p.y}%`;
              }
            }
          }
        },
        scales: {
          x: {
            min: minimo,
            max: maximo,
            title: { display: true, text: 'Ocupación real (%)', color: EJE_TICK },
            ticks: { color: EJE_TICK }, grid: { color: EJE_GRID }
          },
          y: {
            min: minimo,
            max: maximo,
            title: { display: true, text: 'Ocupación predicha (%)', color: EJE_TICK },
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
    // Umbrales realistas para un modelo de ocupación hotelera: el 100% es
    // prácticamente imposible con datos turísticos, así que marcar en rojo
    // todo lo que baje de 70% daría una lectura equivocada.
    if (precision >= 70) return 'high';
    if (precision >= 50) return 'medium';
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

  getOcupacionMax(): number {
    if (!this.resultadoRango?.predicciones_diarias || this.resultadoRango.predicciones_diarias.length === 0) return 0;
    return Math.max(...this.resultadoRango.predicciones_diarias.map((p: any) => p.ocupacion_predicha));
  }

  getOcupacionMin(): number {
    if (!this.resultadoRango?.predicciones_diarias || this.resultadoRango.predicciones_diarias.length === 0) return 0;
    return Math.min(...this.resultadoRango.predicciones_diarias.map((p: any) => p.ocupacion_predicha));
  }

  // ==========================================
  // RESULTADOS DE PREDICCIONES (SOLO LECTURA SALVO SUPER ADMIN)
  // Lista las predicciones ya generadas (tabla `predicciones`) para que el
  // Super Administrador, el Administrador y el Investigador las consulten.
  // Solo el Super Administrador puede validarlas o descartarlas.
  // ==========================================
  async cargarResultados() {
    this.cargandoResultados = true;
    try {
      const response: any = await this.prediccionService.getPredicciones({ limite: 30 }).toPromise();
      this.resultadosPredicciones = response || [];
    } catch (error) {
      console.error('Error cargando resultados de predicciones:', error);
      this.mostrarToast('❌ Error al cargar los resultados de predicciones', 'danger');
    } finally {
      this.cargandoResultados = false;
    }
  }

  async validarResultado(pred: any) {
    try {
      await this.prediccionService.validarPrediccion(pred.id_prediccion).toPromise();
      pred.estado = 'validada';
      this.mostrarToast('✅ Predicción validada', 'success');
    } catch (error) {
      console.error('Error al validar predicción:', error);
      this.mostrarToast('❌ No se pudo validar la predicción', 'danger');
    }
  }

  async descartarResultado(pred: any) {
    try {
      await this.prediccionService.descartarPrediccion(pred.id_prediccion, 'Descartada desde Predicciones').toPromise();
      pred.estado = 'descartada';
      this.mostrarToast('Predicción descartada', 'medium');
    } catch (error) {
      console.error('Error al descartar predicción:', error);
      this.mostrarToast('❌ No se pudo descartar la predicción', 'danger');
    }
  }
}