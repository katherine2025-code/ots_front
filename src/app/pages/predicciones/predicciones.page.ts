import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule, ToastController } from '@ionic/angular';
import { Chart, registerables } from 'chart.js';
import { EtlService } from 'src/app/core/services/etl.service';
import { AuthService } from 'src/app/core/services/auth.service';

Chart.register(...registerables);

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
    private toastController: ToastController
  ) { }

  // ==========================================
  // GETTERS
  // ==========================================
  get isAdmin(): boolean {
    return this.authService.isAdmin();
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

      if (response && response.comparacion) {
        this.modeloListo = true;
        this.comparacion = response.comparacion;
        this.modeloUsado = response.mejor_modelo || 'Modelo listo';
        console.log('📊 Métricas cargadas:', this.metricas);
      }
    } catch (error) {
      console.error('Error cargando métricas:', error);
    }
  }

  async entrenarModelo() {
    this.entrenando = true;
    try {
      const response: any = await this.etlService.entrenarModelo().toPromise();
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

    this.chartComparacion = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: ['Precisión (%)', 'R² Score', 'MAE'],
        datasets: [
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
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'bottom' },
          title: {
            display: true,
            text: 'Comparación: Random Forest vs XGBoost',
            font: { size: 14, weight: 'bold' }
          }
        },
        scales: {
          y: { beginAtZero: true }
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
      const datos = {
        fecha_objetivo: this.fechaObjetivo,
        checkin_nacionales: this.checkinNacionales,
        checkin_extranjeros: this.checkinExtranjeros,
        tarifa_cobrada: this.tarifaCobrada,
        temporada: this.temporada
      };

      const response: any = await this.etlService.predecirOcupacion(datos).toPromise();
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
          legend: { position: 'bottom' },
          title: {
            display: true,
            text: `Predicción con ${this.prediccion.modelo || 'Modelo ML'}`,
            font: { size: 14, weight: 'bold' }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            max: 100,
            title: { display: true, text: 'Ocupación (%)' }
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
      const response: any = await this.etlService
        .predecirOcupacionRango(this.fechaInicioRango, this.fechaFinRango)
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
          legend: { position: 'bottom' },
          title: {
            display: true,
            text: `Tendencia de Ocupación (${this.resultadoRango.fecha_inicio} a ${this.resultadoRango.fecha_fin})`,
            font: { size: 13, weight: 'bold' }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            max: 100,
            title: { display: true, text: 'Ocupación (%)' }
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
          title: { display: true, text: 'Ocupación por Día de Semana', font: { size: 12, weight: 'bold' } }
        },
        scales: { y: { beginAtZero: true, max: 100 } }
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
          legend: { position: 'bottom' },
          title: { display: true, text: 'Comparación por Temporada', font: { size: 12, weight: 'bold' } }
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
          legend: { position: 'bottom' },
          title: {
            display: true,
            text: `Real vs Predicho (Precisión: ${this.precisionPromedio}%)`,
            font: { size: 13, weight: 'bold' }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            max: 100,
            title: { display: true, text: 'Ocupación (%)' }
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