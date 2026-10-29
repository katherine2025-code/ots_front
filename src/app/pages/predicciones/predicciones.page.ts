import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
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
  imports: [CommonModule, FormsModule, IonicModule]
})
export class PrediccionesPage implements OnInit {
  // ==========================================
  // MODO DE PREDICCIÓN
  // ==========================================
  modoPrediccion: 'simulador' | 'rango' = 'simulador';

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

      setTimeout(() => this.crearGraficoComparacion(), 100);

      this.mostrarToast(`✅ Entrenamiento completado. Mejor modelo: ${response.mejor_modelo}`, 'success');
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

      setTimeout(() => this.crearGraficoRango(), 100);
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
          borderColor: 'rgba(142, 68, 173, 1)',
          backgroundColor: 'rgba(142, 68, 173, 0.15)',
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

      console.log('📊 Predicciones históricas:', response);

      setTimeout(() => this.crearGraficoHistoricas(), 100);
      this.mostrarToast(`✅ ${response.total_registros} registros históricos validados`, 'success');
    } catch (error) {
      console.error('Error cargando predicciones históricas:', error);
      this.mostrarToast('⚠️ Error cargando predicciones históricas. Entrene el modelo primero.', 'warning');
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