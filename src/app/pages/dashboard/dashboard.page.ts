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
import { DashboardService } from 'src/app/core/services/dashboard.service';

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

  // true mientras no hay ningún dato real que graficar (se muestra un aviso en vez del canvas,
  // en vez de dibujar un gráfico vacío o con números inventados)
  sinDatosTemporada = false;
  sinDatosParroquia = false;
  sinDatosPredicciones = false;

  constructor(
    private hotelService: HotelService,
    private prediccionService: PrediccionService,
    private ocupacionService: OcupacionService,
    private authService: AuthService,
    private router: Router,
    private cronogramaService: CronogramaService,
    private lugaresService: LugaresService,
    private dashboardService: DashboardService
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
          const reciente = [...m.feriados].reverse().find(f => f.encuestas > 0);
          this.seleccionMapa = reciente ? 'f-' + reciente.feriado : 'todos';
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
      ...m.feriados.map(f => ({ valor: 'f-' + f.feriado, etiqueta: `${f.feriado} (${f.encuestas})` })),
      ...(m.sinFeriado.encuestas > 0 ? [{ valor: 'sin', etiqueta: `Sin feriado asignado (${m.sinFeriado.encuestas})` }] : [])
    ];
    if (JSON.stringify(nuevas) !== JSON.stringify(this.opcionesMapa)) this.opcionesMapa = nuevas;
  }

  private actualizarVistaMapa() {
    const m = this.mapaLugares;
    let grupo: GrupoLugares = GRUPO_VACIO;
    if (m) {
      if (this.seleccionMapa === 'sin') grupo = m.sinFeriado;
      else if (this.seleccionMapa.startsWith('f-')) {
        grupo = m.feriados.find(f => 'f-' + f.feriado === this.seleccionMapa) || m.todos;
      } else grupo = m.todos;
    }
    this.grupoMapa = grupo;
    this.rankingLugares = grupo.lugares.slice(0, 8);
    this.lugaresSinUbicar = grupo.lugares.filter(l => l.lat === null || l.lng === null).length;
  }

  trackPorValor(_: number, o: { valor: string }) { return o.valor; }
  trackPorNombre(_: number, l: { nombre: string }) { return l.nombre; }
  trackPorId(_: number, e: { id: number }) { return e.id; }

  ngAfterViewInit() {
    // El setTimeout da tiempo a que los <canvas> existan en el DOM (aparecen detrás de *ngIf="!loading").
    setTimeout(() => {
      this.cargarGraficoTemporada();
      this.cargarGraficoPredicciones();
      this.cargarGraficoParroquia();
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

  // Distribución de la ocupación real por temporada (Alta/Media, según el feriado de cada
  // registro - ver dashboardService.js). Sin registros con capacidad conocida, no hay nada que
  // graficar: se muestra un aviso en vez de un donut vacío o con números inventados.
  cargarGraficoTemporada() {
    this.dashboardService.getOcupacionPorTemporada().subscribe({
      next: (datos) => {
        this.sinDatosTemporada = datos.length === 0;
        if (this.sinDatosTemporada || !this.chartTemporadaRef) return;

        const colores: Record<string, string> = { Alta: '#667eea', Media: '#10b981', Baja: '#f59e0b' };
        const ctx = this.chartTemporadaRef.nativeElement.getContext('2d');
        this.chartTemporada?.destroy();
        this.chartTemporada = new Chart(ctx, {
          type: 'doughnut',
          data: {
            labels: datos.map(d => `${d.temporada} (${d.registros})`),
            datasets: [{
              data: datos.map(d => parseFloat(d.promedio)),
              backgroundColor: datos.map(d => colores[d.temporada] || '#94a3b8'),
              borderWidth: 0
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { position: 'bottom' } }
          }
        });
      },
      error: () => { this.sinDatosTemporada = true; }
    });
  }

  // Ocupación predicha vs. real por mes: solo predicciones ya validadas contra un dato real.
  // Mientras el modelo no tenga predicciones validadas, este gráfico queda honestamente vacío
  // (con un aviso) en vez de mostrar una comparación inventada.
  cargarGraficoPredicciones() {
    this.dashboardService.getPredichoVsReal().subscribe({
      next: (datos) => {
        this.sinDatosPredicciones = datos.length === 0;
        if (this.sinDatosPredicciones || !this.chartPrediccionesRef) return;

        const ctx = this.chartPrediccionesRef.nativeElement.getContext('2d');
        this.chartPredicciones?.destroy();
        this.chartPredicciones = new Chart(ctx, {
          type: 'bar',
          data: {
            labels: datos.map(d => d.mes),
            datasets: [
              { label: 'Predicho', data: datos.map(d => d.predicho), backgroundColor: '#667eea' },
              { label: 'Real', data: datos.map(d => d.real), backgroundColor: '#10b981' }
            ]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { position: 'top' } }
          }
        });
      },
      error: () => { this.sinDatosPredicciones = true; }
    });
  }

  // Ocupación real promedio por parroquia (de los hoteles con registros de ocupación).
  cargarGraficoParroquia() {
    this.dashboardService.getOcupacionPorParroquia().subscribe({
      next: (datos) => {
        this.sinDatosParroquia = datos.length === 0;
        if (this.sinDatosParroquia || !this.chartParroquiaRef) return;

        const ctx = this.chartParroquiaRef.nativeElement.getContext('2d');
        this.chartParroquia?.destroy();
        this.chartParroquia = new Chart(ctx, {
          type: 'bar',
          data: {
            labels: datos.map(d => d.parroquia),
            datasets: [{
              label: 'Ocupación % (promedio)',
              data: datos.map(d => parseFloat(d.promedio)),
              backgroundColor: '#667eea'
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            indexAxis: 'y',
            plugins: { legend: { display: false } }
          }
        });
      },
      error: () => { this.sinDatosParroquia = true; }
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
    this.prediccionService.validarPrediccion(prediccion.id_prediccion).subscribe({
      next: () => { prediccion.estado = 'validada'; },
      error: (err) => console.error('Error al validar predicción:', err)
    });
  }

  descartarPrediccion(prediccion: any): void {
    if (!confirm(`¿Estás seguro de descartar la predicción del ${prediccion.fecha_objetivo}?`)) return;
    this.prediccionService.descartarPrediccion(prediccion.id_prediccion, 'Descartada desde el dashboard').subscribe({
      next: () => { prediccion.estado = 'descartada'; },
      error: (err) => console.error('Error al descartar predicción:', err)
    });
  }

  generarReporte(): void {
    console.log('Generar reporte');
    this.router.navigate(['/reportes']);
  }
}