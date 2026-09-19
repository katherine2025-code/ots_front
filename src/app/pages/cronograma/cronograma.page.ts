import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AlertController, IonicModule, ToastController } from '@ionic/angular';
import {
  AvanceJornada, CeldaAvance, CronogramaService, FilaEncuestador, JornadaResumen
} from 'src/app/core/services/cronograma.service';
import { EncuestaService } from 'src/app/core/services/encuesta.service';
import { AuthService } from 'src/app/core/services/auth.service';

const DIAS_SEMANA = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const REFRESCO_MS = 10000;
// Se usan si no se pueden leer del cuestionario de hoteles (pregunta "feriado")
const FERIADOS_POR_DEFECTO = ['Año Nuevo', 'Carnaval', 'Semana Santa', 'Día del Trabajo',
  'Primer Grito de la Independencia', 'Día de los Difuntos', 'Navidad y Fin de Año'];

@Component({
  selector: 'app-cronograma',
  templateUrl: './cronograma.page.html',
  styleUrls: ['./cronograma.page.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule]
})
export class CronogramaPage implements OnInit, OnDestroy {
  jornadas: JornadaResumen[] = [];
  jornadaId: number | null = null;
  avance: AvanceJornada | null = null;

  cargando = true;
  error = '';
  autoRefresco = true;
  segundosDesdeActualizacion = 0;

  private temporizadorDatos?: ReturnType<typeof setInterval>;
  private temporizadorReloj?: ReturnType<typeof setInterval>;
  private ultimaActualizacion = 0;

  // Formulario de nueva jornada
  mostrarFormulario = false;
  feriados: string[] = FERIADOS_POR_DEFECTO;
  encuestadores: { id: number; nombre: string }[] = [];
  nueva = { feriado: '', fecha_inicio: '', dias: 3, encuestadores: [] as number[], meta_turista: 10, meta_hotel: 2 };
  guardando = false;
  // Super Administrador y Administrador controlan; el Investigador solo visualiza
  puedeEditar = false;

  constructor(
    private cronogramaService: CronogramaService,
    private encuestaService: EncuestaService,
    private alertController: AlertController,
    private toastController: ToastController,
    private authService: AuthService
  ) { }

  ngOnInit() {
    this.puedeEditar = this.authService.isAdmin();
    if (this.puedeEditar) this.cargarCatalogos();
  }

  ionViewWillEnter() {
    this.cargarJornadas();
    this.iniciarRefresco();
  }

  ionViewWillLeave() {
    this.detenerRefresco();
  }

  ngOnDestroy() {
    this.detenerRefresco();
  }

  // ===== Actualización en vivo =====

  private iniciarRefresco() {
    this.detenerRefresco();
    this.temporizadorDatos = setInterval(() => {
      if (this.autoRefresco && this.jornadaId) this.cargarAvance(false);
    }, REFRESCO_MS);
    this.temporizadorReloj = setInterval(() => {
      this.segundosDesdeActualizacion = this.ultimaActualizacion
        ? Math.floor((Date.now() - this.ultimaActualizacion) / 1000) : 0;
    }, 1000);
  }

  private detenerRefresco() {
    if (this.temporizadorDatos) clearInterval(this.temporizadorDatos);
    if (this.temporizadorReloj) clearInterval(this.temporizadorReloj);
    this.temporizadorDatos = this.temporizadorReloj = undefined;
  }

  // ===== Carga de datos =====

  private cargarCatalogos() {
    this.cronogramaService.getEncuestadores().subscribe({
      next: (lista) => this.encuestadores = lista,
      error: (err) => this.error = err.message
    });
    // Los feriados disponibles son los del cuestionario de hoteles: se mantienen sincronizados
    this.encuestaService.getEncuestaPorTipo('hotel').subscribe({
      next: (enc) => {
        const opciones = enc.preguntas?.find(p => p.codigo === 'feriado')?.opciones;
        if (opciones?.length) this.feriados = opciones;
      },
      error: () => { /* se conserva la lista por defecto */ }
    });
  }

  cargarJornadas(seleccionar?: number) {
    this.cronogramaService.getJornadas().subscribe({
      next: (lista) => {
        this.jornadas = lista;
        this.cargando = false;
        const actual = seleccionar ?? this.jornadaId;
        const existe = lista.some(j => j.id === actual);
        this.jornadaId = existe ? actual : this.jornadaPorDefecto(lista);
        if (this.jornadaId) this.cargarAvance(true); else this.avance = null;
      },
      error: (err) => {
        this.cargando = false;
        this.error = err.message;
      }
    });
  }

  // La que está en curso; si no, la próxima; si no, la más reciente
  private jornadaPorDefecto(lista: JornadaResumen[]): number | null {
    const enCurso = lista.find(j => j.estado === 'en_curso');
    if (enCurso) return enCurso.id;
    const proximas = lista.filter(j => j.estado === 'programada').sort((a, b) => a.fechaInicio.localeCompare(b.fechaInicio));
    return (proximas[0] || lista[0])?.id ?? null;
  }

  cambiarJornada(valor: number) {
    this.jornadaId = valor;
    this.cargarAvance(true);
  }

  cargarAvance(mostrarCarga: boolean) {
    if (!this.jornadaId) return;
    if (mostrarCarga) this.avance = null;
    this.cronogramaService.getAvance(this.jornadaId).subscribe({
      next: (a) => {
        this.avance = a;
        this.error = '';
        this.ultimaActualizacion = Date.now();
        this.segundosDesdeActualizacion = 0;
      },
      error: (err) => this.error = err.message
    });
  }

  // ===== Nueva jornada =====

  abrirFormulario() {
    this.mostrarFormulario = true;
    if (!this.nueva.fecha_inicio) this.nueva.fecha_inicio = new Date().toISOString().slice(0, 10);
  }

  seleccionarTodos() {
    this.nueva.encuestadores = this.encuestadores.map(e => e.id);
  }

  crearJornada() {
    if (this.guardando) return;
    this.guardando = true;
    this.cronogramaService.crearJornada({
      feriado: this.nueva.feriado,
      fecha_inicio: this.nueva.fecha_inicio,
      dias: Number(this.nueva.dias),
      encuestadores: this.nueva.encuestadores,
      meta_turista: Number(this.nueva.meta_turista) || 0,
      meta_hotel: Number(this.nueva.meta_hotel) || 0
    }).subscribe({
      next: (r) => {
        this.guardando = false;
        this.mostrarFormulario = false;
        this.mensaje('Jornada creada', 'success');
        this.cargarJornadas(r.id);
      },
      error: (err) => {
        this.guardando = false;
        this.mensaje(err.message, 'danger');
      }
    });
  }

  // ===== Edición de metas =====

  async editarMeta(fila: FilaEncuestador, fecha: string) {
    if (!this.jornadaId || !this.puedeEditar) return;
    const celda = fila.dias[fecha];
    const alert = await this.alertController.create({
      header: `${fila.nombre}`,
      subHeader: `Meta del ${this.etiquetaDia(fecha)}`,
      message: '0 y 0 significa que ese día no trabaja.',
      inputs: [
        { name: 'turista', type: 'number', min: 0, label: 'Encuestas turísticas', placeholder: 'Turísticas', value: celda.metaTurista },
        { name: 'hotel', type: 'number', min: 0, label: 'Encuestas de alojamiento', placeholder: 'Alojamiento', value: celda.metaHotel }
      ],
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Guardar',
          handler: (datos) => {
            this.cronogramaService.actualizarMeta(this.jornadaId!, {
              id_usuario: fila.id, fecha,
              meta_turista: Number(datos.turista) || 0, meta_hotel: Number(datos.hotel) || 0
            }).subscribe({
              next: () => this.cargarAvance(false),
              error: (err) => this.mensaje(err.message, 'danger')
            });
          }
        }
      ]
    });
    await alert.present();
  }

  // Encuestadores activos que todavía no están en la jornada
  get disponiblesParaAgregar() {
    const enJornada = new Set(this.avance?.encuestadores.filter(f => !f.sinAsignar).map(f => f.id));
    return this.encuestadores.filter(e => !enJornada.has(e.id));
  }

  async agregarEncuestador() {
    if (!this.jornadaId) return;
    const disponibles = this.disponiblesParaAgregar;
    if (disponibles.length === 0) {
      this.mensaje('Todos los encuestadores activos ya están en esta jornada', 'medium');
      return;
    }
    const alert = await this.alertController.create({
      header: 'Agregar encuestador',
      message: 'Se le asignarán las mismas metas todos los días (luego puedes ajustarlas por día).',
      inputs: [
        ...disponibles.map((e, i) => ({ type: 'radio' as const, label: e.nombre, value: e.id, checked: i === 0 })),
      ],
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        { text: 'Siguiente', handler: (id: number) => { this.pedirMetasNuevoEncuestador(id); } }
      ]
    });
    await alert.present();
  }

  private async pedirMetasNuevoEncuestador(idUsuario: number) {
    const alert = await this.alertController.create({
      header: 'Metas diarias',
      inputs: [
        { name: 'turista', type: 'number', min: 0, placeholder: 'Encuestas turísticas por día', value: this.nueva.meta_turista },
        { name: 'hotel', type: 'number', min: 0, placeholder: 'Encuestas de alojamiento por día', value: this.nueva.meta_hotel }
      ],
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Agregar',
          handler: (datos) => {
            this.cronogramaService.agregarEncuestador(this.jornadaId!, {
              id_usuario: idUsuario, meta_turista: Number(datos.turista) || 0, meta_hotel: Number(datos.hotel) || 0
            }).subscribe({
              next: () => this.cargarAvance(false),
              error: (err) => this.mensaje(err.message, 'danger')
            });
          }
        }
      ]
    });
    await alert.present();
  }

  async eliminarJornada() {
    const jornada = this.avance?.jornada;
    if (!jornada) return;
    const alert = await this.alertController.create({
      header: 'Eliminar jornada',
      message: `Se elimina el cronograma de "${jornada.feriado}". Las encuestas ya recolectadas no se borran.`,
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Eliminar', role: 'destructive',
          handler: () => {
            this.cronogramaService.eliminarJornada(jornada.id).subscribe({
              next: () => { this.jornadaId = null; this.cargarJornadas(); },
              error: (err) => this.mensaje(err.message, 'danger')
            });
          }
        }
      ]
    });
    await alert.present();
  }

  // ===== Presentación =====

  porcentaje(hecho: number, meta: number): number {
    return meta > 0 ? Math.min(100, Math.round((hecho / meta) * 100)) : 0;
  }

  // Semáforo de una celda (día de un encuestador)
  estadoCelda(celda: CeldaAvance, fecha: string): string {
    const meta = celda.metaTurista + celda.metaHotel;
    const hecho = celda.hechoTurista + celda.hechoHotel;
    if (meta === 0) return hecho > 0 ? 'extra' : 'libre';
    if (hecho >= meta) return 'cumplida';
    const hoy = this.avance?.hoy || '';
    if (fecha > hoy) return 'pendiente';
    return fecha === hoy ? 'hoy' : 'incompleta';
  }

  etiquetaDia(fecha: string): string {
    const d = this.aFecha(fecha);
    return `${DIAS_SEMANA[d.getDay()]} ${d.getDate()} ${MESES[d.getMonth()]}`;
  }

  corto(fecha: string): { dia: string; num: number } {
    const d = this.aFecha(fecha);
    return { dia: DIAS_SEMANA[d.getDay()], num: d.getDate() };
  }

  etiquetaJornada(j: JornadaResumen): string {
    const estado = { programada: 'programada', en_curso: 'en curso', finalizada: 'finalizada' }[j.estado];
    return `${j.feriado} · ${this.etiquetaDia(j.fechaInicio)} – ${this.etiquetaDia(j.fechaFin)} (${estado})`;
  }

  private aFecha(fecha: string): Date {
    const [a, m, d] = fecha.split('-').map(Number);
    return new Date(a, m - 1, d);
  }

  private async mensaje(texto: string, color: 'success' | 'danger' | 'medium') {
    const toast = await this.toastController.create({ message: texto, duration: 2500, color });
    await toast.present();
  }
}
