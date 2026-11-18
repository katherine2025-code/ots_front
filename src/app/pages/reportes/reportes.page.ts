import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { ReporteService } from 'src/app/core/services/reporte.service';
import { Chart } from 'chart.js';
import { unificarResidencia } from 'src/app/utils/normalizar-residencia';


const NOMBRES_FERIADOS = [
  'Carnaval', 'Semana Santa', 'Día del Trabajador', 'Primer Grito de la Independencia',
  'Día de los Difuntos', 'Navidad', 'Fin de Año'
];

// Paleta categórica de la marca (azul, teal, ámbar, pizarra...); se recicla por índice de opción.
const PALETA = [
  '#2A6F97', '#48A9A7', '#E9A23B', '#475569', '#7FB3D5',
  '#10B981', '#E07A5F', '#94A3B8', '#1F4E6B', '#B7D7D6'
];

// Plugin inline: escribe el porcentaje sobre cada barra / segmento del gráfico, para que el
// valor de cada color quede especificado en el propio gráfico (no solo en la leyenda).
const ETIQUETAS_PORCENTAJE = {
  id: 'etiquetasPorcentaje',
  afterDatasetsDraw(chart: any) {
    const ctx = chart.ctx;
    const esDona = chart.config?.type === 'doughnut';
    const fs = Math.max(9, Math.round((chart.height || 200) / 24));
    chart.data.datasets.forEach((ds: any, di: number) => {
      const meta = chart.getDatasetMeta(di);
      meta.data.forEach((el: any, i: number) => {
        const val = ds.data[i];
        if (val == null || val === 0) return;
        const txt = `${val}%`;
        ctx.save();
        ctx.font = `bold ${fs}px Helvetica, Arial, sans-serif`;
        ctx.textBaseline = 'middle';
        if (esDona) {
          if (val < 5) { ctx.restore(); return; } // no saturar con tajadas diminutas
          const pos = el.tooltipPosition();
          ctx.fillStyle = '#ffffff';
          ctx.textAlign = 'center';
          ctx.fillText(txt, pos.x, pos.y);
        } else {
          ctx.fillStyle = '#1A2A44';
          ctx.textAlign = 'left';
          ctx.fillText(txt, el.x + 4, el.y);
        }
        ctx.restore();
      });
    });
  }
};

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
    const banner = await this.cargarBannerPie();

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

    // Datos reales para el resumen y la tabulación
    const e = this.estadisticas.encuestas || {};
    const o = this.estadisticas.ocupacion || {};
    const totalEnc = this.tabulacion?.totalEncuestas ?? this.tabulacion?.total ?? e.total ?? 0;

    // Metadatos fijos del proyecto (editables si cambian)
    const PROYECTO_TITULO = 'Desarrollo de un sistema de datos para la gestión del turismo en Santa Elena';
    const PROYECTO_REGISTRO = 'INCYT-PNF-2025-D12-212';

    // ===================== PÁGINA 2: RESUMEN DEL ESTUDIO (justo después de la portada) =====================
    doc.addPage();
    this.paginaResumenEstudio(doc, {
      pageW, pageH, mX, contentW, footerH, NAVY, AMBER, GRIS,
      feriadoTxt, anio, totalEnc,
      instrumento: this.encuestaTab === 'hotel'
        ? 'Encuesta MINTUR de capacidad y demanda hotelera (hasta 5 fechas por feriado)'
        : 'Encuesta estructurada de 26 preguntas',
      est: e, ocup: o, esHotel: this.encuestaTab === 'hotel',
      proyecto: PROYECTO_TITULO, registro: PROYECTO_REGISTRO
    });

    // ===================== TABULACIÓN POR SECCIÓN =====================
    doc.addPage();
    const topContent = 16;
    // Reserva al pie el alto de la banda o del banner (lo que sea más alto), para no solaparlos.
    const bannerHmm = banner ? pageW * (banner.h / banner.w) : 0;
    const bottomLimit = pageH - Math.max(footerH, bannerHmm) - 5;
    let y = topContent;

    const preguntas = this.tabulacion?.preguntas || [];
    const ordenSecciones: string[] = [];
    for (const pp of preguntas) if (pp.seccion && !ordenSecciones.includes(pp.seccion)) ordenSecciones.push(pp.seccion);
    let seccionActual = '';

    // HOTELES: tabla de "Información sobre demanda turística" (formato MINTUR, Anexo 1).
    // Son los totales numéricos por fecha que la tabulación por opciones no incluye.
    const dem = this.encuestaTab === 'hotel' ? this.tabulacion?.demanda : null;
    if (dem) {
      doc.setFillColor(NAVY[0], NAVY[1], NAVY[2]); doc.rect(mX, y, contentW, 9, 'F');
      doc.setTextColor(255, 255, 255); doc.setFont('helvetica', 'bold'); doc.setFontSize(11);
      doc.text('INFORMACIÓN SOBRE DEMANDA TURÍSTICA', pageW / 2, y + 6, { align: 'center' });
      y += 13;
      const fmt = (n: any) => Number(n || 0).toLocaleString('es-EC');
      const tarjetas: [string, string][] = [
        ['Establecimientos reportados', fmt(dem.establecimientos)],
        ['Habitaciones disponibles', fmt(dem.habitaciones_disponibles)],
        ['Plazas disponibles', fmt(dem.plazas_disponibles)],
        ['Check-in Nacionales', fmt(dem.checkin_nacionales)],
        ['Check-in Extranjeros', fmt(dem.checkin_extranjeros)],
        ['Total de llegadas', fmt(dem.llegadas_total)],
        ['Pernoctaciones', fmt(dem.pernoctaciones)],
        ['Habitaciones ocupadas', fmt(dem.habitaciones_ocupadas)],
        ['Tarifa promedio cobrada', dem.tarifa_promedio != null ? `$${Number(dem.tarifa_promedio).toFixed(2)}` : 'N/D'],
      ];
      const porFila = 3, cardW = (contentW - 2 * 4) / porFila, cardH = 16, gapC = 4;
      tarjetas.forEach((k, idx) => {
        const col = idx % porFila, fila = Math.floor(idx / porFila);
        const x = mX + col * (cardW + gapC), yb = y + fila * (cardH + gapC);
        doc.setFillColor(244, 246, 249); doc.roundedRect(x, yb, cardW, cardH, 1.5, 1.5, 'F');
        doc.setTextColor(NAVY[0], NAVY[1], NAVY[2]); doc.setFont('helvetica', 'bold'); doc.setFontSize(13);
        doc.text(k[1], x + cardW / 2, yb + 7.5, { align: 'center' });
        doc.setFont('helvetica', 'normal'); doc.setFontSize(7); doc.setTextColor(GRIS[0], GRIS[1], GRIS[2]);
        doc.text(doc.splitTextToSize(k[0], cardW - 5), x + cardW / 2, yb + 12, { align: 'center' });
      });
      y += Math.ceil(tarjetas.length / porFila) * (cardH + gapC) + 2;
      doc.setFont('helvetica', 'italic'); doc.setFontSize(7); doc.setTextColor(120, 120, 120);
      doc.text('Totales agregados de todas las fechas reportadas (Fecha 1 a 5) por los establecimientos del feriado.', mX, y);
      y += 8;
    }

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

      // Título de la pregunta (ancho completo)
      doc.setFont('helvetica', 'bold'); doc.setFontSize(10);
      const tLineas = doc.splitTextToSize(p.titulo + (p.multiple ? '  (opción múltiple)' : ''), contentW);
      const tituloH = tLineas.length * 4.8 + 3;

      // Gráfica GRANDE a alta resolución (barra a todo el ancho; dona centrada).
      const g = this.graficaPreguntaPDF(p, contentW);
      const chartHmm = g ? g.hMm : 0;
      const chartWmm = g ? (g.esDona ? 70 : contentW) : 0;
      const chartXmm = g && g.esDona ? mX + (contentW - 70) / 2 : mX;

      // Leyenda (una columna, bajo la gráfica) con su porcentaje. Se mide el alto.
      doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5);
      let legendH = 0;
      const legendLineas: string[][] = opciones.map((op: any) => {
        const l = doc.splitTextToSize(`${op.etiqueta}  (${op.porcentaje}%)`, contentW - 7);
        legendH += Math.max(4.6, l.length * 3.7) + 1.4;
        return l;
      });

      const notaSatH = (/satisfacci/i.test(p.titulo || '') && p.sinDato > 0) ? 8 : 0;
      const bloqueH = tituloH + chartHmm + 4 + legendH + 8 + notaSatH;
      if (y + bloqueH > bottomLimit) { doc.addPage(); y = topContent; }

      // Título
      doc.setFont('helvetica', 'bold'); doc.setFontSize(10); doc.setTextColor(NAVY[0], NAVY[1], NAVY[2]);
      doc.text(tLineas, mX, y + 4);
      let yy = y + tituloH + 2;

      // Leyenda PRIMERO (arriba del gráfico), con su cuadro de color y porcentaje.
      doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5);
      opciones.forEach((op: any, j: number) => {
        const rgb = this.hexARgb(PALETA[j % PALETA.length]);
        doc.setFillColor(rgb[0], rgb[1], rgb[2]); doc.rect(mX, yy - 0.4, 3, 3, 'F');
        doc.setTextColor(55, 55, 55);
        doc.text(legendLineas[j], mX + 5, yy + 2.2);
        yy += Math.max(4.6, legendLineas[j].length * 3.7) + 1.4;
      });
      yy += 2;

      // Gráfica DEBAJO de la leyenda
      if (g) {
        try { doc.addImage(g.img, 'PNG', chartXmm, yy, chartWmm, chartHmm); } catch { /* grafica omitida */ }
        yy += chartHmm + 3;
      }

      const yFin = yy + 1;
      doc.setFont('helvetica', 'italic'); doc.setFontSize(7); doc.setTextColor(150, 150, 150);
      doc.text(
        p.sinDato > 0
          ? `${p.totalReal} respuestas válidas · ${p.sinDato} sin responder`
          : `${p.totalReal} respuestas válidas`,
        mX, yFin
      );
      let yTrasNota = yFin;
      // Nota SOLO en preguntas de Satisfacción (1-5) con "sin responder": ahí es donde aplica,
      // porque eran opcionales y el sistema no rellena los valores no contestados.
      const esSatisfaccion = /satisfacci/i.test(p.titulo || '');
      if (esSatisfaccion && p.sinDato > 0) {
        const notaSat =
          'Pregunta opcional (escala 1-5): quienes no la respondieron se registran como «sin responder». ' +
          'El sistema no rellena ese valor; por eso respuestas válidas + sin responder = total de encuestas.';
        doc.setFont('helvetica', 'italic'); doc.setFontSize(6.8); doc.setTextColor(120, 120, 120);
        const nl = doc.splitTextToSize(notaSat, contentW - 4);
        doc.text(nl, mX, yFin + 3.4);
        yTrasNota = yFin + 3.4 + (nl.length - 1) * 2.8;
      }
      doc.setDrawColor(224, 227, 231); doc.setLineWidth(0.2); doc.line(mX, yTrasNota + 3, pageW - mX, yTrasNota + 3);
      y = yTrasNota + 8;
    }

    // --- Pie de página: el banner institucional (imagen) va en TODAS las hojas del PDF ---
    const nPaginas = doc.getNumberOfPages();
    const bannerH = banner ? pageW * (banner.h / banner.w) : 0;
    for (let pg = 1; pg <= nPaginas; pg++) {
      doc.setPage(pg);
      if (banner) {
        try { doc.addImage(banner.img, 'PNG', 0, pageH - bannerH, pageW, bannerH); } catch { /* sin banner */ }
      } else {
        // Respaldo si no se pudo cargar la imagen del banner.
        doc.setFillColor(NAVY[0], NAVY[1], NAVY[2]); doc.rect(0, pageH - footerH, pageW, footerH, 'F');
        doc.setTextColor(255, 255, 255); doc.setFont('helvetica', 'bold'); doc.setFontSize(8);
        doc.text('UNIVERSIDAD ESTATAL PENÍNSULA DE SANTA ELENA', mX, pageH - footerH / 2 + 1);
      }
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
    // Ambas encuestas (turística y hotelera) se tabulan desde los datos REALES de la app
    // (respuestas_encuestas), que corresponden a la encuesta final aplicada en campo: cada
    // respuesta trae el código y el texto exacto de su opción. Ya no se tabula desde la tabla
    // del ETL (encuestas_turisticas), que se había llenado desde archivos con un formato
    // distinto y por eso no coincidía con la encuesta final.
    const data: any = await this.reporteService.getTabulacionApp({
      tipo: this.encuestaTab, feriado: filtros.feriado,
      fechaInicio: filtros.fechaInicio, fechaFin: filtros.fechaFin
    }).toPromise();
    return this.aplanarTabulacionApp(data);
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
        // "País de residencia" es texto libre y la gente escribió ciudades además de países;
        // se muestra con un título honesto, sin alterar la pregunta de la encuesta.
        const esResidencia = p.codigo === 'pais_residencia' || /residencia/i.test(p.codigo || '');
        const titulo = esResidencia ? 'Lugar de residencia habitual' : p.titulo;
        // Unifica Ecuador/ECUADOR/ecuador y ciudades del Ecuador en un solo "Ecuador"
        // (y canoniza países) también aquí, por si el backend aún no está desplegado.
        const opciones = esResidencia ? unificarResidencia(p.opciones, p.respondidas) : p.opciones;
        preguntas.push({
          seccion: s.seccion,
          titulo,
          totalReal: p.respondidas,
          sinDato: p.sinDato,
          opciones,
          multiple: p.tipo === 'multiselect'
        });
      }
    }
    return { preguntas, total: data?.total || 0, encuesta: data?.encuesta, fuente: 'app', demanda: data?.demanda || null };
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
        plugins: [ETIQUETAS_PORCENTAJE],
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
          scales: {
            x: { beginAtZero: true, ticks: { callback: (v: any) => v + '%' } },
            // autoSkip: false → muestra TODAS las etiquetas (si no, con muchas opciones
            // Chart.js oculta algunas y una barra grande queda sin su nombre, ej. "Salinas").
            y: { ticks: { autoSkip: false, font: { size: 10 } } }
          }
        }
      });
      this.chartsPreguntas.push(chart);
    });
  }

  // Dibuja la gráfica de UNA pregunta en un canvas fuera de pantalla, a alta resolución
  // (~150 dpi) y con fuentes grandes, SOLO para incrustarla en el PDF. Así las barras salen
  // grandes y legibles sin depender del tamaño que tenga la gráfica en pantalla.
  // Devuelve { img, hMm } (PNG + alto en mm) o null si no se pudo.
  private graficaPreguntaPDF(p: any, contentW: number): { img: string; hMm: number; esDona: boolean } | null {
    const opciones = p.opciones || [];
    if (!opciones.length) return null;
    const esDona = !p.multiple && opciones.length <= 4;
    const PXMM = 6; // píxeles por mm (~150 dpi) para que no se vea borroso
    // Barra: alto proporcional al número de opciones (barras gruesas). Dona: alto fijo.
    const hMm = esDona ? 60 : Math.min(120, Math.max(46, opciones.length * 7 + 16));
    const wMm = esDona ? 70 : contentW;

    const cv = document.createElement('canvas');
    cv.width = Math.round(wMm * PXMM);
    cv.height = Math.round(hMm * PXMM);
    const colores = opciones.map((_: any, j: number) => PALETA[j % PALETA.length]);

    let chart: any = null;
    try {
      chart = new Chart(cv, {
        type: esDona ? 'doughnut' : 'bar',
        plugins: [ETIQUETAS_PORCENTAJE],
        data: {
          labels: opciones.map((o: any) => o.etiqueta),
          datasets: [{
            data: opciones.map((o: any) => o.porcentaje),
            backgroundColor: colores,
            borderWidth: esDona ? 3 : 0
          }]
        },
        options: esDona ? {
          responsive: false, animation: false,
          plugins: { legend: { display: false } }
        } : {
          indexAxis: 'y',
          responsive: false, animation: false,
          plugins: { legend: { display: false } },
          scales: {
            x: { beginAtZero: true, ticks: { font: { size: 18 }, callback: (v: any) => v + '%' } },
            y: { ticks: { autoSkip: false, font: { size: 18 } } }
          }
        }
      });
      const img = cv.toDataURL('image/png');
      return { img, hMm, esDona };
    } catch {
      return null;
    } finally {
      if (chart) chart.destroy();
    }
  }

  // Dona de ocupación hotelera (Ocupación vs Disponible) a alta resolución para el PDF.
  private graficaOcupacionPDF(pct: number): string | null {
    const PX = 6, lado = 58;
    const ocupado = Math.round(pct * 10) / 10;
    const disponible = Math.round((100 - pct) * 10) / 10;
    const cv = document.createElement('canvas');
    cv.width = lado * PX; cv.height = lado * PX;
    let chart: any = null;
    try {
      chart = new Chart(cv, {
        type: 'doughnut',
        plugins: [ETIQUETAS_PORCENTAJE],
        data: {
          labels: ['Ocupación', 'Disponible'],
          datasets: [{ data: [ocupado, disponible], backgroundColor: ['#2A6F97', '#E2E8F0'], borderWidth: 2 }]
        },
        options: { responsive: false, animation: false, cutout: '60%', plugins: { legend: { display: false } } }
      });
      return cv.toDataURL('image/png');
    } catch {
      return null;
    } finally {
      if (chart) chart.destroy();
    }
  }

  // Dibuja la página "RESUMEN DEL ESTUDIO" (ficha técnica + indicadores + dona de ocupación),
  // centrada, con los datos reales. Va después de la portada.
  private paginaResumenEstudio(doc: any, c: any) {
    const { pageW, mX, contentW, NAVY, GRIS, feriadoTxt, anio, totalEnc, est, ocup, esHotel } = c;
    const cx = pageW / 2;
    let yr = 16;

    // Título
    doc.setFillColor(NAVY[0], NAVY[1], NAVY[2]); doc.rect(mX, yr, contentW, 10, 'F');
    doc.setTextColor(255, 255, 255); doc.setFont('helvetica', 'bold'); doc.setFontSize(12);
    doc.text('RESUMEN DEL ESTUDIO', cx, yr + 6.6, { align: 'center' });
    yr += 15;
    doc.setTextColor(GRIS[0], GRIS[1], GRIS[2]); doc.setFont('helvetica', 'normal'); doc.setFontSize(9);
    doc.text(`Feriado ${feriadoTxt} · ${anio}`, cx, yr, { align: 'center' }); yr += 8;

    // --- Ficha técnica (columna centrada) ---
    const tipoMuestra = esHotel ? 'encuestas a establecimientos de alojamiento' : 'encuestas turísticas';
    const ficha: [string, string][] = [
      ['Proyecto', c.proyecto],
      ['Registro', c.registro],
      ['Período', `Feriado ${feriadoTxt} · ${anio}`],
      ['Muestra efectiva', `${totalEnc} ${tipoMuestra} válidas`],
      ['Instrumento', c.instrumento],
      ['Recolección', 'Aplicación del OTS (web y móvil) y, en algunos casos, encuestas impresas'],
      ['Procesamiento', 'Pipeline ETL (extracción, transformación y carga): detección de encabezados, mapeo estandarizado, limpieza y normalización de variables'],
      ['Muestreo', 'No probabilístico por conveniencia, sobre alojamientos formales operativos y turistas dispuestos a participar'],
    ];
    const fichaW = 165, fichaX = (pageW - fichaW) / 2, labW = 34;
    doc.setFont('helvetica', 'bold'); doc.setFontSize(10); doc.setTextColor(NAVY[0], NAVY[1], NAVY[2]);
    doc.text('FICHA TÉCNICA', cx, yr, { align: 'center' }); yr += 5;
    for (const [lab, val] of ficha) {
      doc.setFont('helvetica', 'bold'); doc.setFontSize(8.5); doc.setTextColor(NAVY[0], NAVY[1], NAVY[2]);
      doc.text(`${lab}:`, fichaX, yr);
      doc.setFont('helvetica', 'normal'); doc.setTextColor(60, 60, 60);
      const vLineas = doc.splitTextToSize(val, fichaW - labW);
      doc.text(vLineas, fichaX + labW, yr);
      yr += Math.max(4.6, vLineas.length * 3.9) + 1.6;
    }
    yr += 5;

    // --- Indicadores del feriado (tarjetas centradas) ---
    const ind: [string, string][] = [['Total de encuestas', String(totalEnc)]];
    if (ocup.ocupacion_promedio != null) ind.push(['Ocupación hotelera promedio', `${Number(ocup.ocupacion_promedio).toFixed(1)}%`]);
    if (!esHotel) {
      if (est.satisfaccion_promedio != null) ind.push(['Satisfacción promedio', `${Number(est.satisfaccion_promedio).toFixed(1)} / 5`]);
      if (est.gasto_promedio != null) ind.push(['Gasto promedio por turista', `$${Number(est.gasto_promedio).toFixed(2)}`]);
      if (est.paises != null) ind.push(['Lugares de origen distintos', String(est.paises)]);
    }
    doc.setFont('helvetica', 'bold'); doc.setFontSize(10); doc.setTextColor(NAVY[0], NAVY[1], NAVY[2]);
    doc.text('INDICADORES DEL FERIADO', cx, yr, { align: 'center' }); yr += 4;
    const porFila = 3, cardW = 56, cardH = 15, gapC = 4;
    for (let f = 0; f * porFila < ind.length; f++) {
      const fila = ind.slice(f * porFila, f * porFila + porFila);
      const filaW = fila.length * cardW + (fila.length - 1) * gapC;
      const x0 = (pageW - filaW) / 2;
      fila.forEach((k, idx) => {
        const x = x0 + idx * (cardW + gapC);
        doc.setFillColor(244, 246, 249); doc.roundedRect(x, yr, cardW, cardH, 1.5, 1.5, 'F');
        doc.setTextColor(NAVY[0], NAVY[1], NAVY[2]); doc.setFont('helvetica', 'bold'); doc.setFontSize(12);
        doc.text(k[1], x + cardW / 2, yr + 6.5, { align: 'center' });
        doc.setFont('helvetica', 'normal'); doc.setFontSize(7); doc.setTextColor(GRIS[0], GRIS[1], GRIS[2]);
        doc.text(doc.splitTextToSize(k[0], cardW - 5), x + cardW / 2, yr + 10.5, { align: 'center' });
      });
      yr += cardH + gapC;
    }
    yr += 4;

    // --- Gráfica de ocupación (dona) centrada ---
    if (ocup.ocupacion_promedio != null) {
      const img = this.graficaOcupacionPDF(Number(ocup.ocupacion_promedio));
      if (img) {
        const d = 46;
        try { doc.addImage(img, 'PNG', cx - d / 2, yr, d, d); } catch { /* omitida */ }
        doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(GRIS[0], GRIS[1], GRIS[2]);
        doc.text(`Ocupación hotelera promedio: ${Number(ocup.ocupacion_promedio).toFixed(1)}%`, cx, yr + d + 4, { align: 'center' });
        // leyenda de la dona
        doc.setFillColor(42, 111, 151); doc.rect(cx - 30, yr + d + 7, 3, 3, 'F');
        doc.setTextColor(60, 60, 60); doc.text('Ocupación', cx - 25, yr + d + 9.4);
        doc.setFillColor(226, 232, 240); doc.rect(cx + 2, yr + d + 7, 3, 3, 'F');
        doc.text('Disponible', cx + 7, yr + d + 9.4);
        yr += d + 14;
      }
    }

    // --- Párrafo de cierre (centrado) con cifras reales ---
    const frases: string[] = [];
    if (ocup.ocupacion_promedio != null) frases.push(`Durante el feriado de ${feriadoTxt}, los establecimientos de alojamiento reportaron una ocupación hotelera promedio del ${Number(ocup.ocupacion_promedio).toFixed(1)}%.`);
    if (!esHotel && est.satisfaccion_promedio != null) frases.push(`La satisfacción general de los turistas encuestados fue de ${Number(est.satisfaccion_promedio).toFixed(1)} sobre 5.`);
    frases.push(`En total se procesaron ${totalEnc} ${tipoMuestra} válidas, depuradas y normalizadas por el sistema, lo que garantiza la trazabilidad e integridad de la información presentada.`);
    const cierre = doc.splitTextToSize(frases.join(' '), contentW - 20);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(60, 60, 60);
    doc.text(cierre, cx, yr, { align: 'center' });
  }

  // Banner institucional (Directora del OTS + banda UPSE) al pie de la última página.
  // Carga el banner institucional del pie (assets/icon/banner_pie.png) como data URL con sus
  // dimensiones, para colocarlo a lo ancho en el pie de la última página. null si no se puede.
  private async cargarBannerPie(): Promise<{ img: string; w: number; h: number } | null> {
    try {
      const resp = await fetch('assets/icon/banner_pie.png');
      if (!resp.ok) return null;
      const buf = await resp.arrayBuffer();
      const bytes = new Uint8Array(buf);
      // Dimensiones leídas del header PNG (chunk IHDR: ancho en offset 16, alto en 20).
      let w = 709, h = 75;
      if (bytes.length > 24 && bytes[12] === 0x49 && bytes[13] === 0x48 && bytes[14] === 0x44 && bytes[15] === 0x52) {
        const dv = new DataView(buf);
        w = dv.getUint32(16) || w;
        h = dv.getUint32(20) || h;
      }
      let bin = '';
      for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
      const img = 'data:image/png;base64,' + btoa(bin);
      return { img, w, h };
    } catch {
      return null;
    }
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
