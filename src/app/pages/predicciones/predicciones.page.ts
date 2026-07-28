import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { Chart, registerables } from 'chart.js';
import { EtlService } from 'src/app/core/services/etl.service';

Chart.register(...registerables);

@Component({
  selector: 'app-predicciones',
  templateUrl: './predicciones.page.html',
  styleUrls: ['./predicciones.page.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule]
})
export class PrediccionesPage implements OnInit {
  entrenando: boolean = false;
  prediccionCargada: boolean = false;
  metricas: any = null;
  comparacion: any = null;
  prediccion: any = null;
  chartComparacion: any = null;
  chartPrediccion: any = null;

  // Datos para predicción
  fechaObjetivo: string = '2026-12-25';
  checkinNacionales: number = 50;
  checkinExtranjeros: number = 10;
  tarifaCobrada: number = 80;
  temperatura: number = 26;
  humedad: number = 70;
  precipitacion: number = 0;
  temporada: string = 'Alta';
  pernoctaciones: number = 150; 
  habitacionesOcupadas: number = 75; 

  constructor(private etlService: EtlService) {}

  ngOnInit() {
    this.cargarMetricas();
  }

  async cargarMetricas() {
    try {
      const response: any = await this.etlService.getMetricas().toPromise();
      this.metricas = response;
      console.log(' Métricas cargadas:', this.metricas);
    } catch (error) {
      console.error('Error cargando métricas:', error);
    }
  }

  async entrenarModelo() {
    this.entrenando = true;
    try {
      const response: any = await this.etlService.entrenarModelo().toPromise();
      console.log(' Entrenamiento completado:', response);

      this.metricas = response.metricas;
      this.comparacion = response.comparacion;

      // Crear gráfico comparativo después de un pequeño delay
      setTimeout(() => this.crearGraficoComparacion(), 100);

      alert(` Entrenamiento completado!\n\n🏆 Mejor modelo: ${response.mejor_modelo}\n` +
            ` Random Forest - Precisión: ${response.metricas['Random Forest']?.precision}%\n` +
            ` XGBoost - Precisión: ${response.metricas['XGBoost']?.precision}%`);
    } catch (error) {
      console.error('Error entrenando:', error);
      alert(' Error al entrenar los modelos');
    } finally {
      this.entrenando = false;
    }
  }

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
            font: { size: 16, weight: 'bold' }
          }
        },
        scales: {
          y: { beginAtZero: true }
        }
      }
    });
  }

  async predecir() {
    try {
      const datos = {
        fecha_objetivo: this.fechaObjetivo,
        checkin_nacionales: this.checkinNacionales,
        checkin_extranjeros: this.checkinExtranjeros,
        pernoctaciones: this.pernoctaciones,
        habitaciones_ocupadas: this.habitacionesOcupadas,
        tarifa_cobrada: this.tarifaCobrada,
        temperatura: this.temperatura,
        humedad: this.humedad,
        precipitacion: this.precipitacion,
        total_dias: 3,
        temporada: this.temporada
      };

      const response: any = await this.etlService.predecirOcupacion(datos).toPromise();
      this.prediccion = response;
      this.prediccionCargada = true;

      setTimeout(() => this.crearGraficoPrediccion(), 100);
    } catch (error) {
      console.error('Error prediciendo:', error);
      alert(' Error al generar predicción');
    }
  }

  crearGraficoPrediccion() {
    const ctx = document.getElementById('chartPrediccion') as HTMLCanvasElement;
    if (!ctx || !this.prediccion) return;

    if (this.chartPrediccion) this.chartPrediccion.destroy();

    const valorPredicho = this.prediccion.ocupacion_predicha;
    const errorEstimado = this.prediccion.error_estimado;

    this.chartPrediccion = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: ['Valor Predicho', 'Rango Mínimo', 'Rango Máximo'],
        datasets: [{
          label: 'Ocupación (%)',
          data: [valorPredicho, this.prediccion.rango_prediccion.minimo, this.prediccion.rango_prediccion.maximo],
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
            text: `Predicción con ${this.prediccion.modelo}`,
            font: { size: 16, weight: 'bold' }
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
}