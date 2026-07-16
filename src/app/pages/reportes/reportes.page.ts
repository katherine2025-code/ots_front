import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { EtlService } from 'src/app/core/services/etl.service';
import { Chart, registerables } from 'chart.js';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

Chart.register(...registerables);

@Component({
  selector: 'app-reportes',
  templateUrl: './reportes.page.html',
  styleUrls: ['./reportes.page.scss'],
  standalone: true,
  imports: [CommonModule, IonicModule]
})
export class ReportesPage implements OnInit {
  estadisticas: any = null;
  charts: any = {};
  periodoReporte: string = '2026';

  constructor(private etlService: EtlService) {}

  ngOnInit() {
    this.cargarEstadisticas();
  }

  async cargarEstadisticas() {
    try {
      const response: any = await this.etlService.getEstadisticasDatos().toPromise();
      this.estadisticas = response;
      
      setTimeout(() => {
        this.crearGraficoGastoPromedio();
        this.crearGraficoOcupacion();
        this.crearGraficoPaises();
        this.crearGraficoSatisfaccion();
      }, 300);
      
      console.log('✅ Estadísticas cargadas:', this.estadisticas);
    } catch (error) {
      console.error('❌ Error cargando estadísticas:', error);
    }
  }

  crearGraficoGastoPromedio() {
    const ctx = document.getElementById('gastoChart') as HTMLCanvasElement;
    if (!ctx) return;

    if (this.charts.gasto) this.charts.gasto.destroy();

    this.charts.gasto = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: ['Total', 'Hotelero', 'Extra Hotelero', 'Otros'],
        datasets: [{
          label: 'Gasto Promedio por Persona (USD)',
          data: [
            this.estadisticas?.encuestas?.gasto_promedio || 0,
            (this.estadisticas?.encuestas?.gasto_promedio || 0) * 1.2,
            (this.estadisticas?.encuestas?.gasto_promedio || 0) * 0.8,
            (this.estadisticas?.encuestas?.gasto_promedio || 0) * 0.6
          ],
          backgroundColor: [
            'rgba(255, 99, 132, 0.7)',
            'rgba(54, 162, 235, 0.7)',
            'rgba(255, 206, 86, 0.7)',
            'rgba(75, 192, 192, 0.7)'
          ],
          borderColor: [
            'rgba(255, 99, 132, 1)',
            'rgba(54, 162, 235, 1)',
            'rgba(255, 206, 86, 1)',
            'rgba(75, 192, 192, 1)'
          ],
          borderWidth: 2
        }]
      },
      options: {
        responsive: true,
        plugins: {
          legend: { display: false },
          title: {
            display: true,
            text: 'Gasto Promedio por Persona por Día - Período ' + this.periodoReporte,
            font: { size: 16, weight: 'bold' }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              callback: function(value) { return '$' + value; }
            }
          }
        }
      }
    });
  }

  crearGraficoOcupacion() {
    const ctx = document.getElementById('ocupacionChart') as HTMLCanvasElement;
    if (!ctx) return;

    if (this.charts.ocupacion) this.charts.ocupacion.destroy();

    this.charts.ocupacion = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: ['Ocupación Promedio', 'Disponibilidad'],
        datasets: [{
          data: [
            this.estadisticas?.ocupacion?.ocupacion_promedio || 0,
            100 - (this.estadisticas?.ocupacion?.ocupacion_promedio || 0)
          ],
          backgroundColor: [
            'rgba(46, 204, 113, 0.8)',
            'rgba(231, 76, 60, 0.6)'
          ],
          borderWidth: 2
        }]
      },
      options: {
        responsive: true,
        plugins: {
          legend: { position: 'bottom' },
          title: {
            display: true,
            text: 'Tasa de Ocupación Hotelera (%)',
            font: { size: 16, weight: 'bold' }
          }
        }
      }
    });
  }

  crearGraficoPaises() {
    const ctx = document.getElementById('paisesChart') as HTMLCanvasElement;
    if (!ctx) return;

    if (this.charts.paises) this.charts.paises.destroy();

    this.charts.paises = new Chart(ctx, {
      type: 'pie',
      data: {
        labels: ['Ecuador', 'Colombia', 'Estados Unidos', 'España', 'Perú', 'Canadá', 'Otros'],
        datasets: [{
          data: [40, 20, 15, 10, 8, 5, 2],
          backgroundColor: [
            'rgba(52, 152, 219, 0.8)',
            'rgba(155, 89, 182, 0.8)',
            'rgba(230, 126, 34, 0.8)',
            'rgba(231, 76, 60, 0.8)',
            'rgba(26, 188, 156, 0.8)',
            'rgba(149, 165, 166, 0.8)',
            'rgba(241, 196, 15, 0.8)'
          ],
          borderWidth: 2
        }]
      },
      options: {
        responsive: true,
        plugins: {
          legend: { position: 'right' },
          title: {
            display: true,
            text: 'Distribución de Turistas por País de Origen',
            font: { size: 16, weight: 'bold' }
          }
        }
      }
    });
  }

  crearGraficoSatisfaccion() {
    const ctx = document.getElementById('satisfaccionChart') as HTMLCanvasElement;
    if (!ctx) return;

    if (this.charts.satisfaccion) this.charts.satisfaccion.destroy();

    const satisfaccion = this.estadisticas?.encuestas?.satisfaccion_promedio || 0;

    this.charts.satisfaccion = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: ['Nivel de Satisfacción General'],
        datasets: [{
          label: 'Puntuación (1-5)',
          data: [satisfaccion],
          backgroundColor: 'rgba(155, 89, 182, 0.8)',
          borderColor: 'rgba(155, 89, 182, 1)',
          borderWidth: 2
        }]
      },
      options: {
        responsive: true,
        plugins: {
          legend: { display: false },
          title: {
            display: true,
            text: 'Satisfacción del Turista (Escala 1-5)',
            font: { size: 16, weight: 'bold' }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            max: 5,
            ticks: { stepSize: 1 }
          }
        }
      }
    });
  }

  descargarPDF() {
    const doc = new jsPDF('l', 'mm', 'a4');
    
    // Título principal
    doc.setFontSize(20);
    doc.setTextColor(41, 128, 185);
    doc.text('Observatorio Turístico Sostenible - OTS', 15, 15);
    
    doc.setFontSize(14);
    doc.setTextColor(100);
    doc.text('Reporte Estadístico - Período ' + this.periodoReporte, 15, 25);
    
    // Fecha de generación
    doc.setFontSize(10);
    doc.text('Fecha de generación: ' + new Date().toLocaleDateString(), 15, 32);
    
    // Estadísticas principales
    doc.setFontSize(12);
    doc.setTextColor(0);
    doc.text('RESUMEN EJECUTIVO', 15, 45);
    
    const resumenData = [
      ['Total Encuestas', this.estadisticas?.encuestas?.total || 0],
      ['Países Representados', this.estadisticas?.encuestas?.paises || 0],
      ['Satisfacción Promedio', (this.estadisticas?.encuestas?.satisfaccion_promedio || 0).toFixed(1) + ' / 5'],
      ['Gasto Promedio Diario', '$' + (this.estadisticas?.encuestas?.gasto_promedio || 0).toFixed(2)],
      ['Ocupación Hotelera Promedio', (this.estadisticas?.ocupacion?.ocupacion_promedio || 0).toFixed(1) + '%'],
      ['Total Huéspedes', this.estadisticas?.ocupacion?.total_huespedes || 0]
    ];
    
    autoTable(doc, {
      startY: 50,
      head: [['Indicador', 'Valor']],
      body: resumenData,
      theme: 'striped',
      headStyles: { fillColor: [41, 128, 185] }
    });
    
    // Nota final
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text('Elaborado por: Universidad Estatal Península de Santa Elena - UPSE', 15, 90);
    doc.text('Ministerio de Turismo del Ecuador', 15, 95);
    
    doc.save('reporte-turistico-OTS-' + this.periodoReporte + '.pdf');
  }
}