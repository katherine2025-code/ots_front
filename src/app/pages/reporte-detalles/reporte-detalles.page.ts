import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { ActivatedRoute } from '@angular/router';
import { EtlService } from 'src/app/core/services/etl.service';
import { Chart, registerables } from 'chart.js';

Chart.register(...registerables);

@Component({
  selector: 'app-reporte-detalle',
  templateUrl: './reporte-detalles.page.html',
  styleUrls: ['./reporte-detalles.page.scss'],
  standalone: true,
  imports: [CommonModule, IonicModule]
})
export class ReporteDetallePage implements OnInit {
  idProceso: number = 0;
  proceso: any = null;
  estadisticas: any = null;
  datosGrafico: any[] = [];
  tipoDatos: string = 'encuestas';
  charts: any = {};
  periodoReporte: string = '2026';
  hoy: Date = new Date();

  constructor(
    private route: ActivatedRoute,
    private etlService: EtlService
  ) {}

  ngOnInit() {
    this.idProceso = parseInt(this.route.snapshot.paramMap.get('id') || '0');
    this.cargarDetalles();
  }

  async cargarDetalles() {
    try {
      const response: any = await this.etlService.getProcesoDetalle(this.idProceso).toPromise();
      this.proceso = response.proceso;
      this.estadisticas = response.estadisticas;
      this.datosGrafico = response.datos_grafico || [];
      this.tipoDatos = response.tipo_datos || 'encuestas';
      
      console.log('📊 Tipo de datos:', this.tipoDatos);
      console.log(' Estadísticas:', this.estadisticas);
      console.log('📉 Datos gráfico:', this.datosGrafico);
      
      setTimeout(() => {
        if (this.tipoDatos === 'encuestas') {
          this.crearGraficoEncuestas();
          this.crearGraficoSatisfaccion();
        } else {
          this.crearGraficoOcupacion();
          this.crearGraficoHuespedes();
        }
      }, 300);
      
    } catch (error) {
      console.error('❌ Error cargando detalles:', error);
    }
  }

  // GRÁFICOS PARA ENCUESTAS
  crearGraficoEncuestas() {
    const ctx = document.getElementById('encuestasChart') as HTMLCanvasElement;
    if (!ctx) return;

    if (this.charts.encuestas) this.charts.encuestas.destroy();

    this.charts.encuestas = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: this.datosGrafico.map((d: any) => {
          const fecha = new Date(d.fecha);
          return fecha.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' });
        }),
        datasets: [{
          label: 'Encuestas por día',
          data: this.datosGrafico.map((d: any) => d.total_encuestas || 0),
          backgroundColor: 'rgba(52, 152, 219, 0.8)',
          borderColor: 'rgba(52, 152, 219, 1)',
          borderWidth: 2
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        plugins: {
          legend: { position: 'bottom' },
          title: {
            display: true,
            text: 'Encuestas Recibidas por Día',
            font: { size: 14, weight: 'bold' }
          }
        },
        scales: { y: { beginAtZero: true } }
      }
    });
  }

  crearGraficoSatisfaccion() {
    const ctx = document.getElementById('satisfaccionChart') as HTMLCanvasElement;
    if (!ctx) return;

    if (this.charts.satisfaccion) this.charts.satisfaccion.destroy();

    this.charts.satisfaccion = new Chart(ctx, {
      type: 'line',
      data: {
        labels: this.datosGrafico.map((d: any) => {
          const fecha = new Date(d.fecha);
          return fecha.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' });
        }),
        datasets: [{
          label: 'Satisfacción Promedio (1-5)',
          data: this.datosGrafico.map((d: any) => d.satisfaccion_promedio || 0),
          borderColor: 'rgba(46, 204, 113, 1)',
          backgroundColor: 'rgba(46, 204, 113, 0.2)',
          borderWidth: 3,
          fill: true,
          tension: 0.4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        plugins: {
          legend: { position: 'bottom' },
          title: {
            display: true,
            text: 'Nivel de Satisfacción del Turista',
            font: { size: 14, weight: 'bold' }
          }
        },
        scales: { y: { beginAtZero: true, max: 5 } }
      }
    });
  }

  // GRÁFICOS PARA OCUPACIÓN HOTELERA
  crearGraficoOcupacion() {
    const ctx = document.getElementById('ocupacionChart') as HTMLCanvasElement;
    if (!ctx) return;

    if (this.charts.ocupacion) this.charts.ocupacion.destroy();

    const ocupacionPromedio = this.estadisticas?.ocupacion_promedio || 0;
    const disponibilidad = 100 - ocupacionPromedio;

    this.charts.ocupacion = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: ['Ocupación', 'Disponibilidad'],
        datasets: [{
          data: [ocupacionPromedio, disponibilidad],
          backgroundColor: ['rgba(46, 204, 113, 0.8)', 'rgba(231, 76, 60, 0.6)'],
          borderWidth: 2
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        plugins: {
          legend: { position: 'bottom' },
          title: {
            display: true,
            text: 'Tasa de Ocupación Hotelera',
            font: { size: 14, weight: 'bold' }
          }
        }
      }
    });
  }

  crearGraficoHuespedes() {
    const ctx = document.getElementById('huespedesChart') as HTMLCanvasElement;
    if (!ctx) return;

    if (this.charts.huespedes) this.charts.huespedes.destroy();

    this.charts.huespedes = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: this.datosGrafico.map((d: any) => {
          const fecha = new Date(d.fecha);
          return fecha.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' });
        }),
        datasets: [
          {
            label: 'Nacionales',
            data: this.datosGrafico.map((d: any) => d.nacionales || 0),
            backgroundColor: 'rgba(52, 152, 219, 0.8)'
          },
          {
            label: 'Extranjeros',
            data: this.datosGrafico.map((d: any) => d.extranjeros || 0),
            backgroundColor: 'rgba(155, 89, 182, 0.8)'
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        plugins: {
          legend: { position: 'bottom' },
          title: {
            display: true,
            text: 'Check-in por Fecha',
            font: { size: 14, weight: 'bold' }
          }
        },
        scales: { y: { beginAtZero: true } }
      }
    });
  }

  imprimirReporte() {
    window.print();
  }

  descargarPDF() {
    this.imprimirReporte();
  }
}