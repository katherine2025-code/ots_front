import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { ActivatedRoute } from '@angular/router';
import { EtlService } from 'src/app/core/services/etl.service';
import { Chart, registerables } from 'chart.js';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

Chart.register(...registerables);

@Component({
  selector: 'app-etl-detalles',
  templateUrl: './etl-detalles.page.html',
  styleUrls: ['./etl-detalles.page.scss'],
  standalone: true,
  imports: [CommonModule, IonicModule]
})
export class EtlDetallesPage implements OnInit {
  idProceso: number = 0;
  proceso: any = null;
  estadisticas: any = null;       // ✅ Declarada
  datosGrafico: any[] = [];       // ✅ Declarada
  chart: any = null;

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
      // Llama al endpoint del backend que creamos
      const response: any = await this.etlService.getProcesoDetalle(this.idProceso).toPromise();
      this.proceso = response.proceso;
      this.estadisticas = response.estadisticas;
      this.datosGrafico = response.datos_grafico || [];
      
      // Pequeño delay para asegurar que el canvas del gráfico ya exista en el DOM
      setTimeout(() => this.crearGrafico(), 200);
    } catch (error) {
      console.error('Error cargando detalles:', error);
    }
  }

  crearGrafico() {
    const ctx = document.getElementById('estadisticasChart') as HTMLCanvasElement;
    if (!ctx) return;
    
    if (this.chart) {
      this.chart.destroy();
    }

    this.chart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: this.datosGrafico.map((d: any) => d.fecha),
        datasets: [
          {
            label: 'Ocupación Promedio %',
            data: this.datosGrafico.map((d: any) => d.ocupacion_promedio || 0),
            backgroundColor: 'rgba(102, 126, 234, 0.5)',
            borderColor: '#667eea',
            borderWidth: 1
          }
        ]
      },
      options: {
        responsive: true,
        scales: {
          y: {
            beginAtZero: true,
            max: 100
          }
        }
      }
    });
  }

  descargarPDF() {
    if (!this.proceso || !this.estadisticas) return;

    const doc = new jsPDF();
    
    // Título
    doc.setFontSize(18);
    doc.text(`Reporte ETL - Proceso #${this.idProceso}`, 14, 20);
    
    // Información del proceso
    doc.setFontSize(12);
    doc.text(`Archivo: ${this.proceso.nombre_archivo}`, 14, 35);
    doc.text(`Fecha: ${new Date(this.proceso.fecha_fin).toLocaleString()}`, 14, 42);
    doc.text(`Estado: ${this.proceso.estado}`, 14, 49);
    
    // Estadísticas
    doc.setFontSize(14);
    doc.text('Estadísticas Generales', 14, 65);
    
    const statsData = [
      ['Total Registros', this.estadisticas.total_registros || 0],
      ['Registros Exitosos', this.estadisticas.registros_exitosos || 0],
      ['Registros con Error', this.estadisticas.registros_error || 0],
      ['Tasa de Éxito', `${this.estadisticas.tasa_exito || 0}%`]
    ];
    
    autoTable(doc, {
      startY: 70,
      head: [['Métrica', 'Valor']],
      body: statsData,
      theme: 'striped'
    });
    
    // Guardar archivo
    doc.save(`reporte-etl-${this.idProceso}.pdf`);
  }
}