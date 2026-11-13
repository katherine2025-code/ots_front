import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { ReporteService } from 'src/app/core/services/reporte.service';
import { Chart } from 'chart.js';


const NOMBRES_FERIADOS = [
  'Carnaval', 'Semana Santa', 'Día del Trabajador', 'Primer Grito de la Independencia',
  'Día de los Difuntos', 'Navidad', 'Fin de Año'
];

// Paleta categórica de la marca (azul, teal, ámbar, pizarra...); se recicla por índice de opción.
const PALETA = [
  '#2A6F97', '#48A9A7', '#E9A23B', '#475569', '#7FB3D5',
  '#10B981', '#E07A5F', '#94A3B8', '#1F4E6B', '#B7D7D6'
];

@Component({
  selector: 'app-reportes',
  templateUrl: './reportes.page.html',
  styleUrls: ['./reportes.page.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule]
})
export class ReportesPage implements OnInit {
  estadisticas: any = null;
  tabulacion: any = null;
  // Fuente de la tabulación turística: siempre los datos cargados por importación (tabla
  // encuestas_turisticas). Se conserva la propiedad por compatibilidad interna.
  fuenteTab: 'etl' | 'app' = 'etl';
  // Encuesta que se tabula: 'turista' o 'hotel'. La hotelera sale de las encuestas de la app
  // (respuestas_encuestas); la importación de hoteles guarda ocupación, no respuestas de opción.
  encuestaTab: 'turista' | 'hotel' = 'turista';
  cargando: boolean = false;
  fechaGeneracion: Date = new Date();
  charts: any = {};
  chartsPreguntas: any[] = [];

  // ===== Filtros =====
  feriados: string[] = NOMBRES_FERIADOS;
  filtroFeriado: string = '';
  filtroFechaInicio: string = '';
  filtroFechaFin: string = '';
  filtroAnio: number | null = null;
  aniosDisponibles: number[] = [];

  constructor(private reporteService: ReporteService) {
    const anioActual = new Date().getFullYear();
    // Un rango razonable para el selector de año; no limita los datos reales, solo la lista.
    for (let a = anioActual + 1; a >= anioActual - 3; a--) this.aniosDisponibles.push(a);
  }

  ngOnInit() {
    this.cargarEstadisticas();
  }

  get hayFiltrosActivos(): boolean {
    return !!(this.filtroFeriado || this.filtroFechaInicio || this.filtroFechaFin || this.filtroAnio);
  }

  get tieneGastoPorRubro(): boolean {
    return (this.estadisticas?.gastoPorRubro || []).some((r: any) => r.promedio !== null && r.promedio > 0);
  }

  aplicarFiltros() {
    this.cargarEstadisticas();
  }

  // Genera el PDF del feriado seleccionado con estilo infográfico institucional: portada,
  // encabezados de sección y, por cada pregunta, su leyenda (color + opción + %) junto a su
  // gráfica. Respeta el filtro actual: el PDF corresponde SOLO a ese feriado. Solo logo OTS-UPSE.
  async descargarPDF() {
    if (!this.estadisticas) { return; }
    // Asegura que las gráficas por pregunta estén dibujadas en pantalla, para incrustarlas al PDF.
    if ((this.chartsPreguntas?.length || 0) < (this.tabulacion?.preguntas?.length || 0)) {
      this.crearGraficosTabulacion();
      await new Promise(r => setTimeout(r, 450));
    }
    const { default: jsPDF } = await import('jspdf');

    const doc = new jsPDF('p', 'mm', 'a4');
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const mX = 14;
    const contentW = pageW - mX * 2;
    const footerH = 13;
    const NAVY: [number, number, number] = [26, 42, 68];
    const AMBER: [number, number, number] = [233, 162, 59];
    const GRIS: [number, number, number] = [90, 100, 110];

    const feriadoTxt = this.filtroFeriado || 'Todos los feriados';
    const anio = this.filtroAnio || new Date().getFullYear();
    const tipoTxt = this.encuestaTab === 'hotel'
      ? 'Encuesta de Establecimientos de Alojamiento'
      : 'Encuesta Turística';
    const logo = await this.cargarLogoPDF();

    // ===================== PORTADA =====================
    doc.setFillColor(NAVY[0], NAVY[1], NAVY[2]); doc.rect(0, 0, pageW, 10, 'F');
    doc.setFillColor(AMBER[0], AMBER[1], AMBER[2]); doc.rect(0, 10, pageW, 2, 'F');
    if (logo) { try { doc.addImage(logo, 'PNG', pageW / 2 - 45, 46, 90, 14); } catch { /* sin logo */ } }

    const cajaW = 150, cajaH = 30, cajaX = (pageW - cajaW) / 2, cajaY = 92;
    doc.setFillColor(NAVY[0], NAVY[1], NAVY[2]); doc.roundedRect(cajaX, cajaY, cajaW - 24, cajaH, 2, 2, 'F');
    doc.setFillColor(AMBER[0], AMBER[1], AMBER[2]); doc.roundedRect(cajaX + cajaW - 22, cajaY, 22, cajaH, 2, 2, 'F');
    doc.setTextColor(255, 255, 255); doc.setFont('helvetica', 'bold'); doc.setFontSize(17);
    doc.text('REPORTE TÉCNICO', cajaX + 7, cajaY + 13);
    doc.text('Y ESTADÍSTICO', cajaX + 7, cajaY + 23);
    doc.setTextColor(NAVY[0], NAVY[1], NAVY[2]); doc.setFontSize(19);
    doc.text('01', cajaX + cajaW - 11, cajaY + 19, { align: 'center' });

    doc.setFont('helvetica', 'bold'); doc.setFontSize(23); doc.setTextColor(NAVY[0], NAVY[1], NAVY[2]);
    const ferLineas = doc.splitTextToSize(`FERIADO ${feriadoTxt}`.toUpperCase(), contentW);
    doc.text(ferLineas, pageW / 2, cajaY + 48, { align: 'center' });
    doc.setFontSize(18);
    doc.text(String(anio), pageW / 2, cajaY + 48 + ferLineas.length * 9, { align: 'center' });

    doc.setFont('helvetica', 'normal'); doc.setFontSize(12); doc.setTextColor(GRIS[0], GRIS[1], GRIS[2]);
    doc.text(tipoTxt, pageW / 2, cajaY + 72, { align: 'center' });
    doc.setFontSize(9);
    doc.text(`Observatorio Turístico Sostenible · UPSE · ${new Date().toLocaleDateString()}`, pageW / 2, cajaY + 80, { align: 'center' });

    // ===================== CONTENIDO =====================
    doc.addPage();
    const topContent = 16;
    const bottomLimit = pageH - footerH - 5;
    let y = topContent;

    // Indicadores clave (tarjetas)
    const e = this.estadisticas.encuestas || {};
    const o = this.estadisticas.ocupacion || {};
    const totalEnc = this.tabulacion?.totalEncuestas ?? this.tabulacion?.total ?? e.total ?? 0;
    const kpis: string[][] = [['Total de encuestas', String(totalEnc)]];
    if (this.encuestaTab === 'hotel') {
      if (o.ocupacion_promedio != null) kpis.push(['Ocupación promedio', `${Number(o.ocupacion_promedio).toFixed(1)}%`]);
    } else {
      if (e.paises != null) kpis.push(['Países de origen', String(e.paises)]);
      if (e.satisfaccion_promedio != null) kpis.push(['Satisfacción', `${Number(e.satisfaccion_promedio).toFixed(1)} / 5`]);
      if (e.gasto_promedio != null) kpis.push(['Gasto prom./turista', `$${Number(e.gasto_promedio).toFixed(2)}`]);
      if (o.ocupacion_promedio != null) kpis.push(['Ocupación prom.', `${Number(o.ocupacion_promedio).toFixed(1)}%`]);
    }
    doc.setFont('helvetica', 'bold'); doc.setFontSize(13); doc.setTextColor(NAVY[0], NAVY[1], NAVY[2]);
    doc.text('INDICADORES CLAVE', mX, y); y += 3;
    const kpW = contentW / kpis.length, kpH = 16;
    kpis.forEach((k, idx) => {
      const x = mX + idx * kpW;
      doc.setFillColor(244, 246, 249); doc.roundedRect(x + 1, y, kpW - 2, kpH, 1.5, 1.5, 'F');
      doc.setTextColor(NAVY[0], NAVY[1], NAVY[2]); doc.setFont('helvetica', 'bold'); doc.setFontSize(12);
      doc.text(k[1], x + kpW / 2, y + 7, { align: 'center' });
      doc.setFont('helvetica', 'normal'); doc.setFontSize(7); doc.setTextColor(GRIS[0], GRIS[1], GRIS[2]);
      doc.text(doc.splitTextToSize(k[0], kpW - 4), x + kpW / 2, y + 11, { align: 'center' });
    });
    y += kpH + 10;

    // Tabulación por sección
    const preguntas = this.tabulacion?.preguntas || [];
    const ordenSecciones: string[] = [];
    for (const pp of preguntas) if (pp.seccion && !ordenSecciones.includes(pp.seccion)) ordenSecciones.push(pp.seccion);
    let seccionActual = '';

    for (let i = 0; i < preguntas.length; i++) {
      const p = preguntas[i];
      const opciones = p.opciones || [];

      if (p.seccion && p.seccion !== seccionActual) {
        seccionActual = p.seccion;
        if (y + 16 > bottomLimit) { doc.addPage(); y = topContent; }
        y += 2;
        const letra = String.fromCharCode(65 + Math.max(0, ordenSecciones.indexOf(p.seccion)));
        doc.setFillColor(NAVY[0], NAVY[1], NAVY[2]); doc.rect(mX, y, contentW, 9, 'F');
        doc.setTextColor(255, 255, 255); doc.setFont('helvetica', 'bold'); doc.setFontSize(11);
        doc.text(`SECCIÓN ${letra}. ${p.seccion.toUpperCase()}`, pageW / 2, y + 6, { align: 'center' });
        y += 14;
      }

      const legendW = 98, gap = 6, chartW = contentW - legendW - gap;
      doc.setFont('helvetica', 'normal'); doc.setFontSize(8);
      let legendH = 0;
      const legendLineas: string[][] = opciones.map((op: any) => {
        const l = doc.splitTextToSize(`${op.etiqueta}  (${op.porcentaje}%)`, legendW - 7);
        legendH += Math.max(4.5, l.length * 3.6) + 1.6;
        return l;
      });

      const canvasP = document.getElementById('chart-pregunta-' + i) as HTMLCanvasElement | null;
      let chartImg: string | null = null, chartH = 0;
      if (canvasP && canvasP.width > 0) {
        try {
          chartImg = canvasP.toDataURL('image/png');
          const ar = (canvasP.width / canvasP.height) || 1.4;
          chartH = Math.min(60, chartW / ar);
        } catch { chartImg = null; }
      }

      doc.setFont('helvetica', 'bold'); doc.setFontSize(9.5);
      const tLineas = doc.splitTextToSize(p.titulo + (p.multiple ? '  (opción múltiple)' : ''), contentW);
      const tituloH = tLineas.length * 4.6 + 3;
      const bloqueH = tituloH + Math.max(legendH, chartH) + 9;

      if (y + bloqueH > bottomLimit) { doc.addPage(); y = topContent; }

      doc.setTextColor(NAVY[0], NAVY[1], NAVY[2]);
      doc.text(tLineas, mX, y + 4);
      const yBody = y + tituloH + 3;

      let yl = yBody;
      doc.setFont('helvetica', 'normal'); doc.setFontSize(8);
      opciones.forEach((op: any, j: number) => {
        const rgb = this.hexARgb(PALETA[j % PALETA.length]);
        doc.setFillColor(rgb[0], rgb[1], rgb[2]); doc.rect(mX, yl - 0.4, 3, 3, 'F');
        doc.setTextColor(55, 55, 55);
        doc.text(legendLineas[j], mX + 5, yl + 2.2);
        yl += Math.max(4.5, legendLineas[j].length * 3.6) + 1.6;
      });

      if (chartImg) { try { doc.addImage(chartImg, 'PNG', mX + legendW + gap, yBody, chartW, chartH); } catch { /* grafica omitida */ } }

      const yFin = Math.max(yl, yBody + chartH);
      doc.setFont('helvetica', 'italic'); doc.setFontSize(7); doc.setTextColor(150, 150, 150);
      doc.text(`${p.totalReal} respuestas con dato · ${p.sinDato} sin dato legible`, mX, yFin + 3);
      doc.setDrawColor(224, 227, 231); doc.setLineWidth(0.2); doc.line(mX, yFin + 6, pageW - mX, yFin + 6);
      y = yFin + 11;
    }

    // --- Pie de página institucional (banda) en todas las hojas ---
    const nPaginas = doc.getNumberOfPages();
    for (let pg = 1; pg <= nPaginas; pg++) {
      doc.setPage(pg);
      doc.setFillColor(AMBER[0], AMBER[1], AMBER[2]); doc.rect(0, pageH - footerH - 1.5, pageW, 1.5, 'F');
      doc.setFillColor(NAVY[0], NAVY[1], NAVY[2]); doc.rect(0, pageH - footerH, pageW, footerH, 'F');
      doc.setTextColor(255, 255, 255); doc.setFont('helvetica', 'bold'); doc.setFontSize(8);
      doc.text('UNIVERSIDAD ESTATAL PENÍNSULA DE SANTA ELENA', mX, pageH - footerH / 2 + 1);
      doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5);
      doc.text(`OTS · ${feriadoTxt} · Pág. ${pg} de ${nPaginas}`, pageW - mX, pageH - footerH / 2 + 1, { align: 'right' });
    }

    const slug = (this.filtroFeriado || 'todos').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-');
    doc.save(`reporte-${this.encuestaTab}-${slug}-${new Date().toISOString().split('T')[0]}.pdf`);
  }

  // Carga el logo del OTS como data URL para el PDF; null si no se puede (el PDF se genera igual).
  private async cargarLogoPDF(): Promise<string | null> {
    try {
      const resp = await fetch('assets/icon/logo-ots.png');
      if (!resp.ok) return null;
      const blob = await resp.blob();
      return await new Promise<string>((resolve, reject) => {
        const lector = new FileReader();
        lector.onloadend = () => resolve(lector.result as string);
        lector.onerror = reject;
        lector.readAsDataURL(blob);
      });
    } catch { return null; }
  }

  // Convierte un color hex (#RRGGBB) a [r,g,b] para jsPDF (colores de la leyenda = de las gráficas).
  private hexARgb(hex: string): [number, number, number] {
    const h = (hex || '#000000').replace('#', '');
    return [parseInt(h.substring(0, 2), 16) || 0, parseInt(h.substring(2, 4), 16) || 0, parseInt(h.substring(4, 6), 16) || 0];
  }

  limpiarFiltros() {
    this.filtroFeriado = '';
    this.filtroFechaInicio = '';
    this.filtroFechaFin = '';
    this.filtroAnio = null;
    this.cargarEstadisticas();
  }

  async cargarEstadisticas() {
    this.cargando = true;
    this.fechaGeneracion = new Date();

    const filtros = {
      feriado: this.filtroFeriado || undefined,
      fechaInicio: this.filtroFechaInicio || undefined,
      fechaFin: this.filtroFechaFin || undefined,
      anio: this.filtroAnio || undefined
    };

    try {
      const [estadisticas, tabulacion]: any = await Promise.all([
        this.reporteService.getEstadisticas(filtros).toPromise(),
        this.cargarTabulacion(filtros)
      ]);
      this.estadisticas = estadisticas;
      this.tabulacion = tabulacion;

      setTimeout(() => {
        this.crearGraficoGastoPorFeriado();
        this.crearGraficoGastoPorRubro();
        this.crearGraficoOcupacion();
        this.crearGraficoPaises();
        this.crearGraficoSatisfaccion();
        this.crearGraficosTabulacion();
      }, 300);

    } catch (error) {
      console.error('❌ Error cargando estadísticas:', error);
    } finally {
      this.cargando = false;
    }
  }

  // Carga la tabulación de la encuesta elegida. La turística sale de los datos importados
  // (encuestas_turisticas); la hotelera sale de las encuestas de la app (todas sus preguntas).
  private async cargarTabulacion(filtros: any): Promise<any> {
    if (this.encuestaTab === 'hotel') {
      const data: any = await this.reporteService.getTabulacionApp({
        tipo: 'hotel', feriado: filtros.feriado,
        fechaInicio: filtros.fechaInicio, fechaFin: filtros.fechaFin
      }).toPromise();
      return this.aplanarTabulacionApp(data);
    }
    if (this.fuenteTab === 'app') {
      const data: any = await this.reporteService.getTabulacionApp({
        tipo: 'turista', feriado: filtros.feriado,
        fechaInicio: filtros.fechaInicio, fechaFin: filtros.fechaFin
      }).toPromise();
      return this.aplanarTabulacionApp(data);
    }
    return this.reporteService.getTabulacion(filtros).toPromise();
  }

  // Cambia entre la encuesta turística y la hotelera, y recarga solo la tabulación.
  async cambiarEncuestaTab(tipo: 'turista' | 'hotel') {
    if (this.encuestaTab === tipo) return;
    this.encuestaTab = tipo;
    const filtros = {
      feriado: this.filtroFeriado || undefined,
      fechaInicio: this.filtroFechaInicio || undefined,
      fechaFin: this.filtroFechaFin || undefined,
      anio: this.filtroAnio || undefined
    };
    this.cargando = true;
    try {
      this.tabulacion = await this.cargarTabulacion(filtros);
      setTimeout(() => this.crearGraficosTabulacion(), 300);
    } catch (error) {
      console.error('Error al cambiar la encuesta de tabulación:', error);
    } finally {
      this.cargando = false;
    }
  }

  // Convierte la respuesta de tabulacion-app (secciones -> preguntas) al formato plano que ya
  // usa la vista. Solo preguntas con opciones (categóricas); las abiertas/numéricas se resumen
  // en Estadísticas.
  private aplanarTabulacionApp(data: any): any {
    const preguntas: any[] = [];
    for (const s of (data?.secciones || [])) {
      for (const p of (s.preguntas || [])) {
        if (!p.opciones || p.opciones.length === 0) continue;
        preguntas.push({
          seccion: s.seccion,
          titulo: p.titulo,
          totalReal: p.respondidas,
          sinDato: p.sinDato,
          opciones: p.opciones,
          multiple: p.tipo === 'multiselect'
        });
      }
    }
    return { preguntas, total: data?.total || 0, encuesta: data?.encuesta, fuente: 'app' };
  }

  // (Reservado) Cambia la fuente de la tabulación turística y recarga. Hoy el selector de fuente
  // no se muestra; la turística usa siempre los datos importados.
  async cambiarFuenteTab(fuente: 'etl' | 'app') {
    if (this.fuenteTab === fuente) return;
    this.fuenteTab = fuente;
    const filtros = {
      feriado: this.filtroFeriado || undefined,
      fechaInicio: this.filtroFechaInicio || undefined,
      fechaFin: this.filtroFechaFin || undefined,
      anio: this.filtroAnio || undefined
    };
    this.cargando = true;
    try {
      this.tabulacion = await this.cargarTabulacion(filtros);
      setTimeout(() => this.crearGraficosTabulacion(), 300);
    } catch (error) {
      console.error('Error al cambiar la fuente de tabulación:', error);
    } finally {
      this.cargando = false;
    }
  }

  // ==========================================
  // TABULACIÓN POR PREGUNTA (Sección A, B, C...)
  // ==========================================
  crearGraficosTabulacion() {
    for (const c of this.chartsPreguntas) c?.destroy();
    this.chartsPreguntas = [];

    (this.tabulacion?.preguntas || []).forEach((p: any, i: number) => {
      const ctx = document.getElementById('chart-pregunta-' + i) as HTMLCanvasElement;
      if (!ctx) return;

      const colores = p.opciones.map((_: any, j: number) => PALETA[j % PALETA.length]);
      // Pocas opciones: dona (se lee mejor como proporción del total). Muchas opciones o
      // etiquetas largas: barra horizontal (los nombres no se amontonan). Las de opción
      // múltiple SIEMPRE van en barra: sus porcentajes no suman 100 (cada encuestado marca
      // varias), así que una dona sería engañosa.
      const tipo = (p.multiple || p.opciones.length > 4) ? 'bar' : 'doughnut';

      const chart = new Chart(ctx, {
        type: tipo,
        data: {
          labels: p.opciones.map((o: any) => o.etiqueta),
          datasets: [{
            data: p.opciones.map((o: any) => o.porcentaje),
            backgroundColor: colores,
            borderWidth: tipo === 'doughnut' ? 2 : 0
          }]
        },
        options: tipo === 'doughnut' ? {
          responsive: true, maintainAspectRatio: false,
          plugins: { legend: { display: false } }
        } : {
          indexAxis: 'y',
          responsive: true, maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: { x: { beginAtZero: true, ticks: { callback: (v: any) => v + '%' } } }
        }
      });
      this.chartsPreguntas.push(chart);
    });
  }

  colorOpcion(indicePregunta: number, indiceOpcion: number): string {
    return PALETA[indiceOpcion % PALETA.length];
  }

  // true cuando la pregunta en el índice i abre una sección nueva (para mostrar el encabezado
  // "Sección A. Perfil Sociodemográfico" solo una vez, no antes de cada pregunta).
  esNuevaSeccion(i: number): boolean {
    const preguntas = this.tabulacion?.preguntas || [];
    return i === 0 || preguntas[i].seccion !== preguntas[i - 1].seccion;
  }

  // "Sección A", "Sección B"... según el orden en que aparece cada sección por primera vez.
  letraSeccion(seccion: string): string {
    const preguntas = this.tabulacion?.preguntas || [];
    const orden: string[] = [];
    for (const p of preguntas) if (!orden.includes(p.seccion)) orden.push(p.seccion);
    const idx = orden.indexOf(seccion);
    return String.fromCharCode(65 + (idx >= 0 ? idx : 0));
  }

  // ==========================================
  // GRÁFICOS (datos reales, sin cifras inventadas)
  // ==========================================

  crearGraficoGastoPorFeriado() {
    const ctx = document.getElementById('gastoChart') as HTMLCanvasElement;
    if (!ctx) return;

    if (this.charts.gasto) this.charts.gasto.destroy();

    const datos: any[] = this.estadisticas?.gastoPorFeriado || [];

    this.charts.gasto = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: datos.map(d => d.feriado),
        datasets: [{
          label: 'Gasto Promedio por Turista (USD)',
          data: datos.map(d => d.gasto_promedio !== null ? Number(d.gasto_promedio) : 0),
          backgroundColor: 'rgba(42, 111, 151, 0.85)',
          borderColor: 'rgba(42, 111, 151, 1)',
          borderWidth: 2
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          title: { display: false }
        },
        scales: {
          y: { beginAtZero: true, ticks: { callback: (value) => '$' + value } }
        }
      }
    });
  }

  crearGraficoGastoPorRubro() {
    const ctx = document.getElementById('gastoRubroChart') as HTMLCanvasElement;
    if (!ctx) return;
    if (this.charts.gastoRubro) this.charts.gastoRubro.destroy();

    const datos: any[] = (this.estadisticas?.gastoPorRubro || []).filter((r: any) => r.promedio !== null);
    if (!datos.length) return;

    this.charts.gastoRubro = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: datos.map(d => d.rubro),
        datasets: [{
          label: 'Gasto Promedio por Rubro (USD/día)',
          data: datos.map(d => Number(d.promedio)),
          backgroundColor: 'rgba(72, 169, 167, 0.85)',
          borderColor: 'rgba(72, 169, 167, 1)',
          borderWidth: 2
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          title: { display: false }
        },
        scales: { y: { beginAtZero: true, ticks: { callback: (value) => '$' + value } } }
      }
    });
  }

  crearGraficoOcupacion() {
    const ctx = document.getElementById('ocupacionChart') as HTMLCanvasElement;
    if (!ctx) return;

    if (this.charts.ocupacion) this.charts.ocupacion.destroy();

    const ocupacion = this.estadisticas?.ocupacion?.ocupacion_promedio;
    if (ocupacion === null || ocupacion === undefined) return;

    this.charts.ocupacion = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: ['Ocupación Promedio', 'Disponibilidad'],
        datasets: [{
          data: [ocupacion, 100 - ocupacion],
          backgroundColor: ['#2A6F97', '#E2E8F0'],
          borderWidth: 2
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'bottom' },
          title: { display: false }
        }
      }
    });
  }

  crearGraficoPaises() {
    const ctx = document.getElementById('paisesChart') as HTMLCanvasElement;
    if (!ctx) return;

    if (this.charts.paises) this.charts.paises.destroy();

    const datos: any[] = this.estadisticas?.paises || [];
    const paleta = PALETA;

    this.charts.paises = new Chart(ctx, {
      type: 'pie',
      data: {
        labels: datos.map(d => d.pais),
        datasets: [{
          data: datos.map(d => d.total),
          backgroundColor: paleta.slice(0, datos.length),
          borderWidth: 2
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'right' },
          title: { display: false }
        }
      }
    });
  }

  crearGraficoSatisfaccion() {
    const ctx = document.getElementById('satisfaccionChart') as HTMLCanvasElement;
    if (!ctx) return;

    if (this.charts.satisfaccion) this.charts.satisfaccion.destroy();

    const satisfaccion = this.estadisticas?.encuestas?.satisfaccion_promedio;
    if (satisfaccion === null || satisfaccion === undefined) return;

    this.charts.satisfaccion = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: ['Nivel de Satisfacción General'],
        datasets: [{
          label: 'Puntuación (1-5)',
          data: [satisfaccion],
          backgroundColor: 'rgba(233, 162, 59, 0.85)',
          borderColor: 'rgba(233, 162, 59, 1)',
          borderWidth: 2
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          title: { display: false }
        },
        scales: { y: { beginAtZero: true, max: 5, ticks: { stepSize: 1 } } }
      }
    });
  }
}
