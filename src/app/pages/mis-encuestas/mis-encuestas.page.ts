import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { Router } from '@angular/router';
import { AuthService } from 'src/app/core/services/auth.service';
import { RespuestaService } from 'src/app/core/services/respuesta.service';
import { CronogramaService, DiaMiCronograma, MiCronograma } from 'src/app/core/services/cronograma.service';

const DIAS_SEMANA = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const CIRCUNFERENCIA = 2 * Math.PI * 52;  // radio 52 del anillo de progreso
const REFRESCO_MS = 20000;

@Component({
  selector: 'app-mis-encuestas',
  templateUrl: './mis-encuestas.page.html',
  styleUrls: ['./mis-encuestas.page.scss'],
  standalone: true,
  imports: [CommonModule, IonicModule]
})
export class MisEncuestasPage implements OnInit, OnDestroy {
  nombreUsuario = '';
  pendientes = 0;

  cronograma: MiCronograma | null = null;
  cargandoCronograma = true;
  errorCronograma = '';
  private temporizador?: ReturnType<typeof setInterval>;

  encuestas = [
    {
      tipo: 'turista' as const,
      titulo: 'Encuesta Turística',
      descripcion: 'Perfil, planeación del viaje y satisfacción del visitante.',
      icono: 'people-outline'
    },
    {
      tipo: 'hotel' as const,
      titulo: 'Encuesta de Alojamiento',
      descripcion: 'Ocupación, check-in y tarifas del establecimiento.',
      icono: 'business-outline'
    }
  ];

  constructor(
    private authService: AuthService,
    private router: Router,
    private respuestaService: RespuestaService,
    private cronogramaService: CronogramaService
  ) { }

  ngOnInit() {
    this.authService.currentUser$.subscribe(user => {
      this.nombreUsuario = user?.nombres || '';
    });
  }

  // Al volver a esta pantalla (p. ej. tras enviar una encuesta) se refresca el avance y se
  // reintenta enviar lo guardado sin conexión. Mientras la pantalla está abierta se actualiza sola.
  async ionViewWillEnter() {
    this.cargarCronograma();
    this.temporizador = setInterval(() => this.cargarCronograma(), REFRESCO_MS);

    this.pendientes = this.respuestaService.totalPendientes();
    if (this.pendientes > 0) {
      await this.respuestaService.sincronizarPendientes();
      this.pendientes = this.respuestaService.totalPendientes();
      this.cargarCronograma();
    }
  }

  ionViewWillLeave() {
    this.detenerRefresco();
  }

  ngOnDestroy() {
    this.detenerRefresco();
  }

  private detenerRefresco() {
    if (this.temporizador) {
      clearInterval(this.temporizador);
      this.temporizador = undefined;
    }
  }

  private cargarCronograma() {
    this.cronogramaService.getMiCronograma().subscribe({
      next: (c) => {
        this.cronograma = c;
        this.cargandoCronograma = false;
        this.errorCronograma = '';
      },
      error: (err) => {
        this.cargandoCronograma = false;
        this.errorCronograma = err.message;
      }
    });
  }

  abrirEncuesta(tipo: string) {
    this.router.navigate(['/responder-encuesta', tipo]);
  }

  // ===== Presentación del cronograma =====

  get hoy(): DiaMiCronograma | null {
    return this.cronograma?.hoyDia || null;
  }

  porcentaje(hecho: number, meta: number): number {
    if (meta <= 0) return 0;
    return Math.min(100, Math.round((hecho / meta) * 100));
  }

  get porcentajeHoy(): number {
    return this.hoy ? this.porcentaje(this.hoy.hechoTurista + this.hoy.hechoHotel, this.hoy.metaTurista + this.hoy.metaHotel) : 0;
  }

  get anillo(): string {
    return `${(this.porcentajeHoy / 100) * CIRCUNFERENCIA} ${CIRCUNFERENCIA}`;
  }

  get porcentajeJornada(): number {
    return this.cronograma?.totales ? this.porcentaje(this.cronograma.totales.hecho, this.cronograma.totales.meta) : 0;
  }

  get mensajeHoy(): string {
    const hoy = this.hoy;
    if (!hoy) {
      const c = this.cronograma;
      if (c?.jornada && c.hoy < c.jornada.fechaInicio) return `Tu jornada empieza el ${this.formatoFecha(c.jornada.fechaInicio)}.`;
      if (c?.jornada && c.hoy > c.jornada.fechaFin) return 'Esta jornada ya terminó. ¡Gracias por tu trabajo!';
      return 'Hoy no tienes meta asignada.';
    }
    const meta = hoy.metaTurista + hoy.metaHotel;
    const hecho = hoy.hechoTurista + hoy.hechoHotel;
    if (meta === 0) return 'Hoy no tienes meta asignada.';
    if (hecho >= meta) return '¡Meta de hoy cumplida!';
    const faltan = meta - hecho;
    return `Te ${faltan === 1 ? 'falta' : 'faltan'} ${faltan} encuesta${faltan === 1 ? '' : 's'} para cumplir tu meta de hoy.`;
  }

  // Meta/avance de hoy de un tipo de encuesta, para mostrarlo en su tarjeta
  hoyPorTipo(tipo: 'turista' | 'hotel'): { hecho: number; meta: number } | null {
    const hoy = this.hoy;
    if (!hoy) return null;
    return tipo === 'turista'
      ? { hecho: hoy.hechoTurista, meta: hoy.metaTurista }
      : { hecho: hoy.hechoHotel, meta: hoy.metaHotel };
  }

  nombreDia(fecha: string): string {
    return DIAS_SEMANA[this.aFecha(fecha).getDay()];
  }

  numeroDia(fecha: string): number {
    return this.aFecha(fecha).getDate();
  }

  formatoFecha(fecha: string): string {
    const d = this.aFecha(fecha);
    return `${d.getDate()} ${MESES[d.getMonth()]}`;
  }

  etiquetaEstado(dia: DiaMiCronograma): string {
    switch (dia.estado) {
      case 'cumplida': return 'Cumplida';
      case 'hoy': return 'Hoy';
      case 'incompleta': return 'Incompleta';
      case 'libre': return 'Libre';
      default: return 'Pendiente';
    }
  }

  private aFecha(fecha: string): Date {
    const [a, m, d] = fecha.split('-').map(Number);
    return new Date(a, m - 1, d);
  }
}
