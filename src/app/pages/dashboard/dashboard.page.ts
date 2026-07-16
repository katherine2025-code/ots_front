import { Component, OnInit, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { Router } from '@angular/router';
import { Chart, registerables } from 'chart.js';
import { HotelService } from 'src/app/core/services/hotel.service';
import { PrediccionService } from 'src/app/core/services/prediccion.service';
import { OcupacionService } from 'src/app/core/services/ocupacion.service';
import { AuthService } from 'src/app/core/services/auth.service';
import { SidebarComponent } from 'src/app/shared/components/sidebar/sidebar.component';
import { ChartOcupacionComponent } from 'src/app/shared/components/chart-ocupacion/chart-ocupacion.component';

Chart.register(...registerables);

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.page.html',
  styleUrls: ['./dashboard.page.scss'],
  standalone: true,
  imports: [
    CommonModule, 
    FormsModule, 
    IonicModule, 
    SidebarComponent,
    ChartOcupacionComponent
  ]
})
export class DashboardPage implements OnInit, AfterViewInit {
  @ViewChild('chartTemporada') chartTemporadaRef!: ElementRef;
  @ViewChild('chartPredicciones') chartPrediccionesRef!: ElementRef;
  @ViewChild('chartParroquia') chartParroquiaRef!: ElementRef;

  usuario: any = null;
  rolNombre: string = '';
  isAdmin: boolean = false;
  isInvestigador: boolean = false;
  
  metricas = {
    totalHoteles: 0,
    ocupacionPromedio: 0,
    prediccionesHoy: 0,
    precisionModelo: 0
  };

  datosOcupacion: any[] = [];
  prediccionesRecientes: any[] = [];
  loading = true;

  private chartTemporada: Chart | undefined;
  private chartPredicciones: Chart | undefined;
  private chartParroquia: Chart | undefined;

  constructor(
    private hotelService: HotelService,
    private prediccionService: PrediccionService,
    private ocupacionService: OcupacionService,
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit() {
    this.authService.currentUser$.subscribe(user => {
      this.usuario = user;
      this.rolNombre = this.authService.getRolNombre();
      this.isAdmin = this.authService.isAdmin();
      this.isInvestigador = this.authService.isInvestigador();
    });
    
    this.cargarDashboard();
  }

  ngAfterViewInit() {
    setTimeout(() => {
      this.crearGraficoTemporada();
      this.crearGraficoPredicciones();
      this.crearGraficoParroquia();
    }, 500);
  }

  cargarDashboard(): void {
    this.loading = true;

    this.hotelService.getHoteles().subscribe({
      next: (hoteles: any[]) => {
        this.metricas.totalHoteles = hoteles.length;
      }
    });

    this.ocupacionService.getEstadisticas().subscribe({
      next: (stats: any) => {
        this.metricas.ocupacionPromedio = stats.ocupacion_promedio || 0;
        this.datosOcupacion = stats.ultimos_30_dias || [];
      }
    });

    this.prediccionService.getMetricasModelo().subscribe({
      next: (metricas: any) => {
        this.metricas.prediccionesHoy = metricas.predicciones_hoy || 0;
        this.metricas.precisionModelo = metricas.precision_promedio || 0;
      }
    });

    this.prediccionService.getPredicciones({ limite: 10 }).subscribe({
      next: (predicciones: any[]) => {
        this.prediccionesRecientes = predicciones;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      }
    });
  }

  crearGraficoTemporada() {
    if (!this.chartTemporadaRef) return;

    const ctx = this.chartTemporadaRef.nativeElement.getContext('2d');
    
    if (this.chartTemporada) {
      this.chartTemporada.destroy();
    }

    this.chartTemporada = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: ['Alta', 'Media', 'Baja'],
        datasets: [{
          data: [45, 30, 25],
          backgroundColor: ['#667eea', '#10b981', '#f59e0b'],
          borderWidth: 0
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom'
          }
        }
      }
    });
  }

  crearGraficoPredicciones() {
    if (!this.chartPrediccionesRef) return;

    const ctx = this.chartPrediccionesRef.nativeElement.getContext('2d');
    
    if (this.chartPredicciones) {
      this.chartPredicciones.destroy();
    }

    this.chartPredicciones = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun'],
        datasets: [
          {
            label: 'Predicho',
            data: [75, 82, 78, 85, 90, 88],
            backgroundColor: '#667eea'
          },
          {
            label: 'Real',
            data: [73, 80, 76, 83, 88, 86],
            backgroundColor: '#10b981'
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'top'
          }
        }
      }
    });
  }

  crearGraficoParroquia() {
    if (!this.chartParroquiaRef) return;

    const ctx = this.chartParroquiaRef.nativeElement.getContext('2d');
    
    if (this.chartParroquia) {
      this.chartParroquia.destroy();
    }

    this.chartParroquia = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: ['Santa Elena', 'La Libertad', 'Salinas', 'Ancon', 'Manglaralto'],
        datasets: [{
          label: 'Ocupación %',
          data: [85, 78, 92, 70, 65],
          backgroundColor: '#667eea'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        indexAxis: 'y',
        plugins: {
          legend: {
            display: false
          }
        }
      }
    });
  }

  getPrecisionClass(precision: number): string {
    if (precision >= 90) return 'high';
    if (precision >= 75) return 'medium';
    return 'low';
  }

  navegarA(ruta: string): void {
    this.router.navigate([ruta]);
  }

  validarPrediccion(prediccion: any): void {
    console.log('Validar predicción:', prediccion);
    // Implementar lógica de validación

    // Aquí iría la llamada al servicio
  this.prediccionService.validarPrediccion(prediccion.id).subscribe()
  alert(`Predicción ${prediccion.id} validada correctamente`);
  }

  descartarPrediccion(prediccion: any): void {
    console.log('Descartar predicción:', prediccion);
    // Implementar lógica de descarte

    const confirmacion = confirm(`¿Estás seguro de descartar la predicción ${prediccion.id}?`);
  if (confirmacion) {
    // this.prediccionService.descartarPrediccion(prediccion.id).subscribe(...)
    alert('Predicción descartada');
  }
  }

  generarReporte(): void {
    console.log('Generar reporte');
    this.router.navigate(['/reportes']);
  }
}