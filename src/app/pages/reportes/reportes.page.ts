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

// Significado de la escala de satisfacción 1-5 (para que el reporte se comprenda, no solo números).
const ESCALA_SATISF: { [k: string]: string } = {
  '1': '1 · Muy insatisfecho',
  '2': '2 · Insatisfecho',
  '3': '3 · Ni satisfecho ni insatisfecho',
  '4': '4 · Satisfecho',
  '5': '5 · Muy satisfecho',
  'N/A': 'N/A · No aplica'
};

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
    const banner = await this.cargarImagenPNG('assets/icon/banner_pie.png');
    const directora = await this.cargarImagenPNG('assets/icon/dir_ots.png');
    const fotoPortada = await this.cargarImagenJPG('assets/icon/imagen_turistica.jpg');

    // Número de reporte (editable). La tutora pidió que este sea el 06.
    const NUMERO_REPORTE = '06';
    const bannerHport = banner ? pageW * (banner.h / banner.w) : footerH;

    // ===================== PORTADA (foto a página completa, texto encima y centrado) =====================
    // 1) Foto a PÁGINA COMPLETA (cover: se ajusta por alto y recorta a los lados).
    if (fotoPortada) {
      const imgH = pageH;
      const imgW = imgH * (fotoPortada.w / fotoPortada.h);
      try { doc.addImage(fotoPortada.img, 'JPEG', (pageW - imgW) / 2, 0, imgW, imgH); } catch { /* sin foto */ }
    }
    // 2) Velo DEGRADADO oscuro de arriba hacia abajo: fuerte arriba (donde va el texto) y se
    //    funde con la foto hacia el centro, para que el título se lea claramente sobre la imagen
    //    sin verse como una banda plana (efecto de portada tipo "cover").
    try {
      const gradH = 122, pasos = 44;
      for (let i = 0; i < pasos; i++) {
        const t = i / (pasos - 1);
        doc.setGState(new (doc as any).GState({ opacity: 0.66 * (1 - t) }));
        doc.setFillColor(NAVY[0], NAVY[1], NAVY[2]);
        doc.rect(0, (gradH * i) / pasos, pageW, gradH / pasos + 0.4, 'F');
      }
      doc.setGState(new (doc as any).GState({ opacity: 1 }));
    } catch { /* si no hay GState, el texto va directo sobre la foto */ }
    // Línea de marca superior
    doc.setFillColor(AMBER[0], AMBER[1], AMBER[2]); doc.rect(0, 0, pageW, 2, 'F');

    // 3) Logo centrado (sobre la foto)
    if (logo) {
      const lw = 74, lh = lw * (60 / 402);
      try { doc.addImage(logo, 'PNG', pageW / 2 - lw / 2, 12, lw, lh); } catch { /* sin logo */ }
    }

    // 4) Caja "REPORTE TÉCNICO Y ESTADÍSTICO" + número (bloque centrado)
    const cajaW = 150, cajaH = 20, cajaX = (pageW - cajaW) / 2, cajaY = 32;
    doc.setFillColor(NAVY[0], NAVY[1], NAVY[2]); doc.roundedRect(cajaX, cajaY, cajaW - 24, cajaH, 2, 2, 'F');
    doc.setFillColor(AMBER[0], AMBER[1], AMBER[2]); doc.roundedRect(cajaX + cajaW - 22, cajaY, 22, cajaH, 2, 2, 'F');
    doc.setTextColor(255, 255, 255); doc.setFont('helvetica', 'bold'); doc.setFontSize(14);
    doc.text('REPORTE TÉCNICO', cajaX + 7, cajaY + 8.5);
    doc.text('Y ESTADÍSTICO', cajaX + 7, cajaY + 15.5);
    doc.setTextColor(NAVY[0], NAVY[1], NAVY[2]); doc.setFontSize(17);
    doc.text(NUMERO_REPORTE, cajaX + cajaW - 11, cajaY + 13, { align: 'center' });

    // 5) FERIADO <nombre> <año>, todo CENTRADO sobre la foto
    const fy = cajaY + cajaH + 13;
    doc.setFont('helvetica', 'bold'); doc.setFontSize(20); doc.setTextColor(AMBER[0], AMBER[1], AMBER[2]);
    doc.text('FERIADO', pageW / 2, fy, { align: 'center' });
    doc.setTextColor(255, 255, 255); doc.setFontSize(18);
    const ferLineas = doc.splitTextToSize(feriadoTxt.toUpperCase(), contentW - 20);
    doc.text(ferLineas, pageW / 2, fy + 9, { align: 'center' });
    let fyAnio = fy + 9 + ferLineas.length * 7 + 3;
    // Caja de año centrada
    doc.setFillColor(AMBER[0], AMBER[1], AMBER[2]); doc.roundedRect(pageW / 2 - 16, fyAnio - 6, 32, 13, 2, 2, 'F');
    doc.setTextColor(NAVY[0], NAVY[1], NAVY[2]); doc.setFontSize(13);
    doc.text(String(anio), pageW / 2, fyAnio + 2.5, { align: 'center' });
    // Tipo de encuesta (pequeño, centrado)
    doc.setFont('helvetica', 'normal'); doc.setFontSize(10); doc.setTextColor(235, 238, 242);
    doc.text(tipoTxt, pageW / 2, fyAnio + 12, { align: 'center' });

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
        [`Tarifa prom. por persona (n=${dem.hoteles_tarifa_persona ?? 0})`, dem.tarifa_promedio_persona != null ? `$${Number(dem.tarifa_promedio_persona).toFixed(2)}` : 'N/D'],
        [`Tarifa prom. por habitación (n=${dem.hoteles_tarifa_habitacion ?? 0})`, dem.tarifa_promedio_habitacion != null ? `$${Number(dem.tarifa_promedio_habitacion).toFixed(2)}` : 'N/D'],
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
        if (y + 12 > bottomLimit) { doc.addPage(); y = topContent; }
        y += 1;
        const letra = String.fromCharCode(65 + Math.max(0, ordenSecciones.indexOf(p.seccion)));
        doc.setFillColor(NAVY[0], NAVY[1], NAVY[2]); doc.rect(mX, y, contentW, 7.5, 'F');
        doc.setTextColor(255, 255, 255); doc.setFont('helvetica', 'bold'); doc.setFontSize(10);
        doc.text(`SECCIÓN ${letra}. ${p.seccion.toUpperCase()}`, pageW / 2, y + 5, { align: 'center' });
        y += 11;
      }

      // LAYOUT HORIZONTAL COMPACTO: porcentajes a la IZQUIERDA, gráfico de barras AL LADO.
      const legendW = 82, gapLC = 5, chartCol = contentW - legendW - gapLC;

      // Título (ancho completo)
      doc.setFont('helvetica', 'bold'); doc.setFontSize(9);
      const tLineas = doc.splitTextToSize(p.titulo + (p.multiple ? '  (opción múltiple)' : ''), contentW);
      const tituloH = tLineas.length * 4 + 2;

      // Gráfica (se renderiza al ancho de la columna derecha)
      const g = this.graficaPreguntaPDF(p, chartCol);
      const chartHmm = g ? g.hMm : 0;
      const chartWmm = g ? (g.esDona ? Math.min(52, chartCol) : chartCol) : 0;

      // Porcentajes (izquierda): una línea por opción, con su cuadro de color
      doc.setFont('helvetica', 'normal'); doc.setFontSize(7.6);
      const legendLineas: string[][] = opciones.map((op: any) =>
        doc.splitTextToSize(`${op.etiqueta}  (${op.porcentaje}%)`, legendW - 5));
      const legendH = legendLineas.reduce((a, l) => a + Math.max(3.6, l.length * 3.1) + 0.8, 0);

      const cuerpoH = Math.max(legendH, chartHmm);
      const esSatisf = /satisfacci/i.test(p.titulo || '');
      const notaSatH = (esSatisf && p.sinDato > 0) ? 5 : 0;
      const bloqueH = tituloH + cuerpoH + 5 + notaSatH;
      if (y + bloqueH > bottomLimit) { doc.addPage(); y = topContent; }

      // Título
      doc.setFont('helvetica', 'bold'); doc.setFontSize(9.5); doc.setTextColor(NAVY[0], NAVY[1], NAVY[2]);
      doc.text(tLineas, mX, y + 4);
      const yBody = y + tituloH + 2;

      // Porcentajes a la izquierda
      doc.setFont('helvetica', 'normal'); doc.setFontSize(7.6);
      let yl = yBody;
      opciones.forEach((op: any, j: number) => {
        const rgb = this.hexARgb(PALETA[j % PALETA.length]);
        doc.setFillColor(rgb[0], rgb[1], rgb[2]); doc.rect(mX, yl - 0.2, 2.4, 2.4, 'F');
        doc.setTextColor(55, 55, 55);
        doc.text(legendLineas[j], mX + 3.8, yl + 1.9);
        yl += Math.max(3.6, legendLineas[j].length * 3.1) + 0.8;
      });

      // Gráfica a la derecha
      if (g) {
        const chartX = g.esDona ? mX + legendW + gapLC + (chartCol - chartWmm) / 2 : mX + legendW + gapLC;
        try { doc.addImage(g.img, 'PNG', chartX, yBody, chartWmm, chartHmm); } catch { /* grafica omitida */ }
      }

      let yFin = yBody + cuerpoH + 2;
      doc.setFont('helvetica', 'italic'); doc.setFontSize(6.8); doc.setTextColor(150, 150, 150);
      doc.text(
        p.sinDato > 0
          ? `${p.totalReal} respuestas válidas · ${p.sinDato} sin responder`
          : `${p.totalReal} respuestas válidas`,
        mX, yFin
      );
      if (esSatisf && p.sinDato > 0) {
        doc.setFontSize(6.4); doc.setTextColor(130, 130, 130);
        doc.text('Pregunta opcional (escala 1-5): quienes no la respondieron se registran como «sin responder».', mX, yFin + 3);
        yFin += 3;
      }
      doc.setDrawColor(224, 227, 231); doc.setLineWidth(0.2); doc.line(mX, yFin + 2, pageW - mX, yFin + 2);
      y = yFin + 4.5;
    }

    // --- Pie de página: el banner institucional (imagen) va en TODAS las hojas del PDF ---
    const nPaginas = doc.getNumberOfPages();
    const bannerH = banner ? pageW * (banner.h / banner.w) : 0;
    const dirH = directora ? Math.min(11, pageW * 0.56 * (directora.h / directora.w)) : 0;
    for (let pg = 1; pg <= nPaginas; pg++) {
      doc.setPage(pg);
      // El nombre de la Directora va arriba del banner en la PORTADA y en la última página.
      if (directora && (pg === 1 || pg === nPaginas)) {
        const dirW = dirH * (directora.w / directora.h);
        try { doc.addImage(directora.img, 'PNG', (pageW - dirW) / 2, pageH - bannerH - dirH - 2.5, dirW, dirH); } catch { /* sin firma */ }
      }
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
        let opciones = esResidencia ? unificarResidencia(p.opciones, p.respondidas) : p.opciones;
        // Satisfacción (escala 1-5): se añade el significado de la escala para que se comprenda
        // (1 = Muy insatisfecho ... 5 = Muy satisfecho), como pidió la revisión.
        const esEscala15 = p.tipo === 'escala' && (p.opciones || []).every((o: any) => ESCALA_SATISF[o.etiqueta] !== undefined);
        if (esEscala15) {
          opciones = opciones.map((o: any) => ({ ...o, etiqueta: ESCALA_SATISF[o.etiqueta] || o.etiqueta }));
        }
        // Lugares visitados: Ayampe y Canoa se agrupan en "Ayangue" (indicación de la revisión;
        // quedan dentro de la zona de referencia). Se suman sus conteos y se recalcula el %.
        if (p.codigo === 'lugares_visitados') {
          opciones = this.agruparOpciones(opciones, ['Ayampe', 'Canoa'], 'Ayangue', p.respondidas);
        }
        preguntas.push({
          seccion: s.seccion,
          titulo,
          totalReal: p.respondidas,
          sinDato: p.sinDato,
          opciones,
          multiple: p.tipo === 'multiselect',
          escala: esEscala15
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
    // Compacto (va al lado de los porcentajes): alto proporcional al número de opciones.
    const hMm = esDona ? 40 : Math.min(72, Math.max(22, opciones.length * 4.2 + 8));
    const wMm = esDona ? 48 : contentW;

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
          layout: { padding: { right: 42 } }, // espacio para que el % del final no se corte
          plugins: { legend: { display: false } },
          scales: {
            // Los nombres ya están en la columna de porcentajes al lado → se ocultan en el eje
            // para que las barras sean más anchas y no se duplique el texto.
            x: { beginAtZero: true, ticks: { font: { size: 16 }, callback: (v: any) => v + '%' } },
            y: { ticks: { display: false }, grid: { display: false } }
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

  // Carga un PNG de assets como data URL + dimensiones (leídas del header IHDR, sin depender de
  // que el navegador lo decodifique). Devuelve null si no se puede. Se usa para el banner y para
  // la franja con el nombre de la directora en el pie de la última página.
  private async cargarImagenPNG(ruta: string): Promise<{ img: string; w: number; h: number } | null> {
    try {
      const resp = await fetch(ruta);
      if (!resp.ok) return null;
      const buf = await resp.arrayBuffer();
      const bytes = new Uint8Array(buf);
      let w = 0, h = 0;
      if (bytes.length > 24 && bytes[12] === 0x49 && bytes[13] === 0x48 && bytes[14] === 0x44 && bytes[15] === 0x52) {
        const dv = new DataView(buf);
        w = dv.getUint32(16); h = dv.getUint32(20);
      }
      if (!w || !h) return null;
      let bin = '';
      for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
      return { img: 'data:image/png;base64,' + btoa(bin), w, h };
    } catch {
      return null;
    }
  }

  // Carga una foto JPG (p. ej. la imagen turística de la portada) como data URL + dimensiones
  // (leídas del marcador SOF del JPEG). null si no se puede.
  private async cargarImagenJPG(ruta: string): Promise<{ img: string; w: number; h: number } | null> {
    try {
      const resp = await fetch(ruta);
      if (!resp.ok) return null;
      const buf = await resp.arrayBuffer();
      const bytes = new Uint8Array(buf);
      let w = 0, h = 0, i = 2;
      while (i < bytes.length - 8) {
        if (bytes[i] !== 0xFF) { i++; continue; }
        const m = bytes[i + 1];
        if (m >= 0xC0 && m <= 0xCF && m !== 0xC4 && m !== 0xC8 && m !== 0xCC) {
          h = (bytes[i + 5] << 8) | bytes[i + 6];
          w = (bytes[i + 7] << 8) | bytes[i + 8];
          break;
        }
        i += 2 + ((bytes[i + 2] << 8) | bytes[i + 3]);
      }
      if (!w || !h) { w = 1200; h = 1600; }
      let bin = '';
      for (let k = 0; k < bytes.length; k++) bin += String.fromCharCode(bytes[k]);
      return { img: 'data:image/jpeg;base64,' + btoa(bin), w, h };
    } catch {
      return null;
    }
  }

  // Agrupa varias etiquetas de una pregunta (p. ej. Ayampe, Canoa) dentro de otra (Ayangue):
  // suma sus conteos en la etiqueta destino y recalcula el porcentaje sobre las respuestas.
  private agruparOpciones(
    opciones: Array<{ etiqueta: string; total: number; porcentaje: number }>,
    desde: string[],
    hacia: string,
    respondidas: number
  ): Array<{ etiqueta: string; total: number; porcentaje: number }> {
    const aAgrupar = new Set(desde.map((d) => d.toLowerCase()));
    let sumaDesde = 0;
    const resto: typeof opciones = [];
    let destino = opciones.find((o) => o.etiqueta.toLowerCase() === hacia.toLowerCase());
    for (const o of opciones) {
      if (aAgrupar.has(o.etiqueta.toLowerCase())) { sumaDesde += o.total || 0; continue; }
      if (o.etiqueta.toLowerCase() === hacia.toLowerCase()) continue; // se vuelve a insertar actualizado
      resto.push(o);
    }
    const totalDestino = (destino?.total || 0) + sumaDesde;
    const base = respondidas || 1;
    const nuevoDestino = { etiqueta: hacia, total: totalDestino, porcentaje: Math.round((totalDestino / base) * 1000) / 10 };
    // Mantiene el destino en su posición original si ya existía; si no, lo agrega al final.
    if (destino) {
      return opciones
        .filter((o) => !aAgrupar.has(o.etiqueta.toLowerCase()))
        .map((o) => (o.etiqueta.toLowerCase() === hacia.toLowerCase() ? nuevoDestino : o));
    }
    return [...resto, nuevoDestino];
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
