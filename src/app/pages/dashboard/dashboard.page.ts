import { Component, OnInit, OnDestroy, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { Router, RouterLink } from '@angular/router';
import { Chart, registerables } from 'chart.js';
import { HotelService } from 'src/app/core/services/hotel.service';
import { PrediccionService } from 'src/app/core/services/prediccion.service';
import { OcupacionService } from 'src/app/core/services/ocupacion.service';
import { AuthService } from 'src/app/core/services/auth.service';
import { ChartOcupacionComponent } from 'src/app/shared/components/chart-ocupacion/chart-ocupacion.component';
import { MapaLugaresComponent } from 'src/app/shared/components/mapa-lugares/mapa-lugares.component';
import { CronogramaService, AvanceJornada, FilaEncuestador } from 'src/app/core/services/cronograma.service';
import { GrupoLugares, LugarVisita, LugaresService, MapaLugares } from 'src/app/core/services/lugares.service';

const GRUPO_VACIO: GrupoLugares = { encuestas: 0, lugares: [] };

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
    // ❌ ELIMINAR SidebarComponent - ya está en app.component.ts
    ChartOcupacionComponent,
    MapaLugaresComponent,
    RouterLink
  ]
})
export class DashboardPage implements OnInit, AfterViewInit, OnDestroy {
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

  // ===== Jornada de recolección en curso (resumen) =====
  resumenJornada: AvanceJornada | null = null;
  topEncuestadores: FilaEncuestador[] = [];
  jornadaCargada = false;

  // ===== Mapa: lugares más visitados por feriado =====
  mapaLugares: MapaLugares | null = null;
  seleccionMapa = 'todos';
  // Se calculan UNA vez al cargar datos o cambiar la selección. No deben ser getters: un getter que
  // devuelve objetos nuevos en cada revisión hace que Angular recree el DOM sin fin (la página se congela).
  opcionesMapa: { valor: string; etiqueta: string }[] = [];
  grupoMapa: GrupoLugares = GRUPO_VACIO;
  rankingLugares: LugarVisita[] = [];
  lugaresSinUbicar = 0;
  private seleccionMapaInicial = true;
  private temporizadorEnVivo?: ReturnType<typeof setInterval>;

  private chartTemporada: Chart | undefined;
  private chartPredicciones: Chart | undefined;
  private chartParroquia: Chart | undefined;

  constructor(
    private hotelService: HotelService,
    private prediccionService: PrediccionService,
    private ocupacionService: OcupacionService,
    private authService: AuthService,
    private router: Router,
    private cronogramaService: CronogramaService,
    private lugaresService: LugaresService
  ) { }

  ngOnInit() {
    this.authService.currentUser$.subscribe(user => {
      this.usuario = user;
      this.rolNombre = this.authService.getRolNombre();
      this.isAdmin = this.authService.isAdmin();
      this.isInvestigador = this.authService.isInvestigador();
    });

    this.cargarDashboard();
  }

  // Al entrar al dashboard se cargan (y se refrescan cada 30 s) la jornada en curso y el mapa
  ionViewWillEnter() {
    this.cargarJornada();
    this.cargarMapa();
    this.detenerEnVivo();
    this.temporizadorEnVivo = setInterval(() => { this.cargarJornada(); this.cargarMapa(); }, 30000);
  }

  ionViewWillLeave() {
    this.detenerEnVivo();
  }

  ngOnDestroy() {
    this.detenerEnVivo();
  }

  private detenerEnVivo() {
    if (this.temporizadorEnVivo) {
      clearInterval(this.temporizadorEnVivo);
      this.temporizadorEnVivo = undefined;
    }
  }

  // ---------- Jornada de recolección ----------

  cargarJornada() {
    this.cronogramaService.getResumen().subscribe({
      next: (r) => {
        this.resumenJornada = r.jornada ? (r as AvanceJornada) : null;
        this.topEncuestadores = (this.resumenJornada?.encuestadores || []).slice(0, 5);
        this.jornadaCargada = true;
      },
      error: () => { this.jornadaCargada = true; }
    });
  }

  porcentaje(hecho: number, meta: number): number {
    return meta > 0 ? Math.min(100, Math.round((hecho / meta) * 100)) : 0;
  }

  get estadoJornada(): string {
    switch (this.resumenJornada?.estado) {
      case 'en_curso': return 'En curso';
      case 'programada': return 'Programada';
      default: return 'Finalizada';
    }
  }

  // ---------- Mapa de lugares ----------

  cargarMapa() {
    this.lugaresService.getMapa().subscribe({
      next: (m) => {
        this.mapaLugares = m;
        this.actualizarOpcionesMapa(m);
        if (this.seleccionMapaInicial) {
          this.seleccionMapaInicial = false;
          // Por defecto: el feriado más reciente que ya tenga datos; si no hay, todos
          const reciente = m.jornadas.find(j => j.encuestas > 0);
          this.seleccionMapa = reciente ? 'j-' + reciente.id : 'todos';
        }
        this.actualizarVistaMapa();
      },
      error: () => { /* el resto del dashboard sigue funcionando */ }
    });
  }

  cambiarSeleccionMapa(valor: string) {
    this.seleccionMapa = valor;
    this.actualizarVistaMapa();
  }

  // Solo reemplaza la lista si cambió, para no recrear las opciones del selector en cada refresco
  private actualizarOpcionesMapa(m: MapaLugares) {
    const nuevas = [
      { valor: 'todos', etiqueta: 'Todos los feriados' },
      ...m.jornadas.map(j => ({ valor: 'j-' + j.id, etiqueta: j.feriado + ' ' + j.anio })),
      ...(m.fueraDeJornada.encuestas > 0 ? [{ valor: 'fuera', etiqueta: 'Fuera de una jornada' }] : [])
    ];
    if (JSON.stringify(nuevas) !== JSON.stringify(this.opcionesMapa)) this.opcionesMapa = nuevas;
  }

  private actualizarVistaMapa() {
    const m = this.mapaLugares;
    let grupo: GrupoLugares = GRUPO_VACIO;
    if (m) {
      if (this.seleccionMapa === 'fuera') grupo = m.fueraDeJornada;
      else if (this.seleccionMapa.startsWith('j-')) grupo = m.jornadas.find(j => 'j-' + j.id === this.seleccionMapa) || m.todos;
      else grupo = m.todos;
    }
    this.grupoMapa = grupo;
    this.rankingLugares = grupo.lugares.slice(0, 8);
    this.lugaresSinUbicar = grupo.lugares.filter(l => l.lat === null || l.lng === null).length;
  }

  trackPorValor(_: number, o: { valor: string }) { return o.valor; }
  trackPorNombre(_: number, l: { nombre: string }) { return l.nombre; }
  trackPorId(_: number, e: { id: number }) { return e.id; }

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
      },
      error: () => {
        // Manejar error
      }
    });

    this.ocupacionService.getEstadisticas().subscribe({
      next: (stats: any) => {
        this.metricas.ocupacionPromedio = stats.ocupacion_promedio || 0;
        this.datosOcupacion = stats.ultimos_30_dias || [];
      },
      error: () => {
        // Manejar error
      }
    });

    this.prediccionService.getMetricasModelo().subscribe({
      next: (metricas: any) => {
        this.metricas.prediccionesHoy = metricas.predicciones_hoy || 0;
        this.metricas.precisionModelo = metricas.precision_promedio || 0;
      },
      error: () => {
        // Manejar error
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
    alert(`Predicción ${prediccion.id} validada correctamente`);
  }

  descartarPrediccion(prediccion: any): void {
    console.log('Descartar predicción:', prediccion);
    const confirmacion = confirm(`¿Estás seguro de descartar la predicción ${prediccion.id}?`);
    if (confirmacion) {
      alert('Predicción descartada');
    }
  }

  generarReporte(): void {
    console.log('Generar reporte');
    this.router.navigate(['/reportes']);
  }
}