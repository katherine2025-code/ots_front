import { Component, OnInit, ViewChild, ElementRef, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule, AlertController } from '@ionic/angular';
import { SidebarComponent } from 'src/app/shared/components/sidebar/sidebar.component';
import { EtlService } from 'src/app/core/services/etl.service';
import { AuthService } from 'src/app/core/services/auth.service';
import { HttpEventType } from '@angular/common/http';
import { Router } from '@angular/router';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

@Component({
  selector: 'app-etl',
  templateUrl: './etl.page.html',
  styleUrls: ['./etl.page.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule, SidebarComponent]
})
export class EtlPage implements OnInit, OnDestroy {
  @ViewChild('fileInput') fileInput!: ElementRef;

  usuario: any = null;
  selectedFile: File | null = null;
  uploadProgress: number = 0;
  isUploading: boolean = false;
  uploadSuccess: boolean = false;
  uploadError: string = '';
  resultadoCarga: any = null;
  
  tiposDatos: any[] = [];
  historial: any[] = [];
  estadisticas: any = null;
  estadoProcesos: any = null;
  logsErrores: any[] = [];
  ejecucionesProgramadas: any[] = [];
  
  tipoCarga: string = 'ocupacion';
  filtroHistorial: string = '';
  isDragging: boolean = false;
  tabActiva: string = 'cargar';

  //  NUEVAS VARIABLES PARA VALIDACIÓN ML
  resultadoValidacion: any = null;
  cargandoValidacion: boolean = false;
  modoValidacion: string = 'todos';
  private procesoIntervalo: any;

  constructor(
    private etlService: EtlService,
    private authService: AuthService,
    private alertController: AlertController,
    private router: Router
  ) {}

  ngOnInit() {
    console.log('Inicializando página ETL');
    this.authService.currentUser$.subscribe(user => {
      console.log(' Usuario actual:', user);
      this.usuario = user;
    });
    this.cargarDatosIniciales();

    this.procesoIntervalo = setInterval(() => {
      this.cargarEstadoProcesos();
    }, 5000);
  }

  ngOnDestroy() {
    if (this.procesoIntervalo) {
      clearInterval(this.procesoIntervalo);
    }
  }

  onTipoCargaChange(event: any) {
    this.tipoCarga = event.target.value;
    console.log('Tipo de carga cambiado a:', this.tipoCarga);
  }

  verReporteDetalle(id: number) {
    this.router.navigate([`/reporte-detalle/${id}`]);
  }

  cargarDatosIniciales() {
    this.cargarTiposDatos();
    this.cargarHistorial();
    this.cargarEstadisticas();
    this.cargarEstadoProcesos();
    this.cargarLogsErrores();
    this.cargarEjecucionesProgramadas();
  }

  cargarTiposDatos() {
    this.etlService.getTiposDatos().subscribe({
      next: (data) => {
        console.log('Tipos de datos cargados:', data);
        this.tiposDatos = data;
      },
      error: (err) => {
        console.error('Error cargando tipos, usando defaults:', err);
        this.tiposDatos = [
          { tipo: 'ocupacion', nombre: 'Ocupación Hotelera', descripcion: 'Datos de ocupación de hoteles', campos_requeridos: ['fecha', 'id_hotel', 'habitaciones_ocupadas', 'ocupacion_porcentaje'] },
          { tipo: 'clima', nombre: 'Datos Climáticos', descripcion: 'Temperatura, humedad, precipitación', campos_requeridos: ['fecha', 'temperatura', 'humedad', 'precipitacion'] },
          { tipo: 'feriados', nombre: 'Días Feriados', descripcion: 'Calendario de feriados', campos_requeridos: ['nombre', 'fecha_inicio', 'fecha_fin'] },
          { tipo: 'encuestas', nombre: 'Encuestas Turísticas', descripcion: 'Datos de encuestas a turistas', campos_requeridos: ['fecha_encuesta', 'genero', 'edad', 'pais_residencia'] }
        ];
      }
    });
  }

  cargarHistorial() {
    this.etlService.getHistorial(1, 20, this.filtroHistorial).subscribe({
      next: (data: any) => this.historial = data.data || data,
      error: (err) => console.error('Error historial:', err)
    });
  }

  cargarEstadisticas() {
    this.etlService.getEstadisticasDatos().subscribe({
      next: (data) => this.estadisticas = data,
      error: (err) => console.error('Error estadísticas:', err)
    });
  }

  cargarEstadoProcesos() {
    this.etlService.getEstadoProcesos().subscribe({
      next: (data) => this.estadoProcesos = data,
      error: (err) => console.error('Error estado:', err)
    });
  }

  cargarLogsErrores() {
    this.etlService.getLogsErrores(10).subscribe({
      next: (data) => this.logsErrores = data,
      error: (err) => console.error('Error logs:', err)
    });
  }

  cargarEjecucionesProgramadas() {
    this.etlService.getEjecucionesProgramadas().subscribe({
      next: (data) => this.ejecucionesProgramadas = data,
      error: (err) => console.error('Error programadas:', err)
    });
  }

  abrirSelectorArchivos() {
    if (this.fileInput && this.fileInput.nativeElement) {
      this.fileInput.nativeElement.click();
    }
  }

  onDragOver(event: DragEvent) {
    event.preventDefault();
    this.isDragging = true;
  }

  onDragLeave(event: DragEvent) {
    event.preventDefault();
    this.isDragging = false;
  }

  onDrop(event: DragEvent) {
    event.preventDefault();
    this.isDragging = false;
    const files = event.dataTransfer?.files;
    if (files && files.length > 0) {
      this.validarYSeleccionarArchivo(files[0]);
    }
  }

  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      this.validarYSeleccionarArchivo(file);
    }
  }

  validarYSeleccionarArchivo(file: File) {
    if (file.type !== 'text/csv' && !file.name.endsWith('.csv')) {
      this.uploadError = 'Solo se permiten archivos CSV';
      this.selectedFile = null;
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      this.uploadError = 'El archivo no puede superar 10MB';
      this.selectedFile = null;
      return;
    }
    this.selectedFile = file;
    this.uploadError = '';
  }

  async cargarArchivo() {
    if (!this.selectedFile) {
      this.uploadError = 'Selecciona un archivo primero';
      return;
    }
    if (!this.tipoCarga) {
      this.uploadError = 'Selecciona el tipo de datos';
      return;
    }

    this.isUploading = true;
    this.uploadProgress = 0;
    this.uploadError = '';
    this.uploadSuccess = false;
    this.resultadoCarga = null;

    this.etlService.cargarArchivo(this.selectedFile, this.tipoCarga).subscribe({
      next: (event: any) => {
        if (event.type === HttpEventType.UploadProgress && event.total) {
          this.uploadProgress = Math.round(100 * event.loaded / event.total);
        } else if (event.type === HttpEventType.Response) {
          this.uploadProgress = 100;
          this.uploadSuccess = true;
          this.resultadoCarga = event.body;
          this.selectedFile = null;
          this.isUploading = false;
          
          setTimeout(() => {
            this.cargarDatosIniciales();
            this.mostrarResultadoProcesamiento();
          }, 1000);
        }
      },
      error: (err) => {
        this.uploadError = err.error?.error || err.message || 'Error al procesar el archivo';
        this.isUploading = false;

         setTimeout(() => {
          this.cargarDatosIniciales();
        }, 1000);
      }
    });
  }

  mostrarResultadoProcesamiento() {
    if (this.resultadoCarga) {
      const exitosos = this.resultadoCarga.exitosos || this.resultadoCarga.registros_insertados || 0;
      const errores = this.resultadoCarga.errores || this.resultadoCarga.registros_error || 0;
      
      if (exitosos > 0 && errores === 0) {
        alert(` Proceso completado exitosamente\n\n Registros insertados: ${exitosos}\n Errores: ${errores}`);
      } else if (exitosos > 0 && errores > 0) {
        alert(` Proceso completado con errores\n\n Exitosos: ${exitosos}\n Errores: ${errores}`);
      } else {
        alert(` Proceso fallido\n\n Errores: ${errores}\n\nRevisa los logs para más detalles`);
      }
    }
  }

  clearFile() {
    this.selectedFile = null;
    this.uploadProgress = 0;
    this.uploadError = '';
    this.resultadoCarga = null;
    if (this.fileInput) {
      this.fileInput.nativeElement.value = '';
    }
  }

  cambiarTab(tab: string) {
    this.tabActiva = tab;
  }

  // ==========================================
  // ✅ NUEVO MÉTODO: VALIDACIÓN HISTÓRICA ML
  // ==========================================
  validarModeloConHistorico(modo: 'todos' | 'limite' | 'dias') {
    this.modoValidacion = modo;
    this.cargandoValidacion = true;
    this.resultadoValidacion = null;

    let limite = modo === 'limite' ? 100 : undefined;
    let dias = modo === 'dias' ? 90 : undefined;

    console.log(` Iniciando validación histórica. Modo: ${modo}`);

    this.etlService.getHistoricalPredictions(limite, dias).subscribe({
      next: (data) => {
        this.resultadoValidacion = data;
        this.cargandoValidacion = false;
        console.log(' Validación histórica completada:', data);
      },
      error: (err) => {
        console.error(' Error en validación histórica:', err);
        this.cargandoValidacion = false;
        this.alertController.create({
          header: 'Error',
          message: 'No se pudo realizar la validación. Asegúrate de haber entrenado el modelo primero.',
          buttons: ['OK']
        }).then(alert => alert.present());
      }
    });
  }

  // ==========================================
  // ✅ MÉTODOS PARA REPORTE PDF
  // ==========================================

  async descargarReportePDF(idProceso: number) {
    try {
      console.log('Generando reporte PDF para proceso:', idProceso);
      const response: any = await this.etlService.getProcesoDetalle(idProceso).toPromise();
      
      if (!response || !response.proceso) {
        alert('No se encontró la información del proceso.');
        return;
      }
      this.generarPDFReporte(response.proceso, response.estadisticas, response.datos_grafico);
    } catch (error) {
      console.error('Error al generar reporte:', error);
      alert('Ocurrió un error al generar el reporte PDF.');
    }
  }

  async generarPDFReporte(proceso: any, estadisticas: any, datosGrafico: any[]) {
    const { default: jsPDF } = await import('jspdf');
    const { default: autoTable } = await import('jspdf-autotable');

    const doc = new jsPDF('l', 'mm', 'a4');
    
    doc.setFontSize(16);
    doc.setTextColor(41, 128, 185);
    doc.text('OBSERVATORIO TURÍSTICO SOSTENIBLE - UPSE', 140, 15, { align: 'center' });
    
    doc.setFontSize(12);
    doc.setTextColor(100);
    const tipoReporte = proceso.tipo_datos === 'encuestas' ? 
      'Reporte de Encuestas Turísticas' : 'Reporte de Ocupación Hotelera';
    doc.text(tipoReporte, 140, 22, { align: 'center' });
    
    doc.setDrawColor(41, 128, 185);
    doc.setLineWidth(0.5);
    doc.line(15, 25, 280, 25);

    doc.setFontSize(11);
    doc.setTextColor(0);
    doc.text('INFORMACIÓN DEL PROCESO ETL', 15, 32);
    
    const infoProceso = [
      ['ID Proceso:', proceso.id_etl.toString()],
      ['Archivo:', proceso.nombre_archivo.substring(0, 50)],
      ['Fecha de Carga:', new Date(proceso.fecha_fin).toLocaleString()],
      ['Estado:', proceso.estado],
      ['Total Registros:', (estadisticas.total_registros || 0).toString()],
      ['Tasa de Éxito:', `${estadisticas.tasa_exito || 100}%`]
    ];
    
    autoTable(doc, {
      startY: 35,
      head: [['Campo', 'Valor']],
      body: infoProceso,
      theme: 'striped',
      headStyles: { fillColor: [41, 128, 185], textColor: 255 },
      styles: { fontSize: 9 },
      columnStyles: { 0: { cellWidth: 40 }, 1: { cellWidth: 220 } }
    });
    
    let currentY = (doc as any).lastAutoTable.finalY + 8;
    
    doc.setFontSize(12);
    doc.setTextColor(41, 128, 185);
    doc.text('INDICADORES CLAVE', 15, currentY);
    currentY += 5;
    
    if (estadisticas) {
      const statsData = [];

      if (proceso.tipo_datos === 'encuestas') {
        statsData.push(['Total Encuestas', estadisticas.total_registros?.toString() || '0', 'Registros procesados']);
        statsData.push(['Países Diferentes', estadisticas.paises_diferentes?.toString() || '0', 'Origen de turistas']);
        statsData.push(['Satisfacción Promedio', `${estadisticas.satisfaccion_promedio || 0} / 5`, 'Nivel de satisfacción']);
        statsData.push(['Gasto Promedio', `$${estadisticas.gasto_promedio || 0}`, 'Gasto por turista']);
        statsData.push(['Edad Promedio', `${estadisticas.edad_promedio || 0} años`, 'Edad de turistas']);
        statsData.push(['Género Femenino', `${estadisticas.genero_femenino || 0} (${((estadisticas.genero_femenino || 0) / (estadisticas.total_registros || 1) * 100).toFixed(1)}%)`, 'Distribución por género']);
        statsData.push(['Género Masculino', `${estadisticas.genero_masculino || 0} (${((estadisticas.genero_masculino || 0) / (estadisticas.total_registros || 1) * 100).toFixed(1)}%)`, 'Distribución por género']);
        statsData.push(['Satisfechos', `${estadisticas.satisfechos || 0} (${((estadisticas.satisfechos || 0) / (estadisticas.total_registros || 1) * 100).toFixed(1)}%)`, 'Satisfacción >= 4']);
      } else {
        statsData.push(['Total Registros', estadisticas.total_registros?.toString() || '0', 'Registros procesados']);
        statsData.push(['Ocupación Promedio', `${estadisticas.ocupacion_promedio || 0}%`, 'Habitaciones ocupadas']);
        statsData.push(['Tarifa Promedio', `$${estadisticas.tarifa_promedio || 0}`, 'Ingreso por habitación']);
        statsData.push(['Total Huéspedes', estadisticas.total_huespedes?.toString() || '0', 'Nacionales + Extranjeros']);
        statsData.push(['Habitaciones Promedio', estadisticas.habitaciones_promedio?.toString() || '0', 'Por día']);
        statsData.push(['Ocupación Mínima', `${estadisticas.ocupacion_minima || 0}%`, 'Mínimo histórico']);
        statsData.push(['Ocupación Máxima', `${estadisticas.ocupacion_maxima || 0}%`, 'Máximo histórico']);
      }
      
      autoTable(doc, {
        startY: currentY,
        head: [['Indicador', 'Valor', 'Descripción']],
        body: statsData,
        theme: 'striped',
        headStyles: { fillColor: [52, 152, 219], textColor: 255 },
        styles: { fontSize: 9 },
        columnStyles: { 0: { cellWidth: 60 }, 1: { cellWidth: 60 }, 2: { cellWidth: 140 } }
      });
    }

    if (datosGrafico && datosGrafico.length > 0) {
      for (const grafico of datosGrafico) {
        currentY = (doc as any).lastAutoTable.finalY + 8;
        
        if (currentY > 180) {
          doc.addPage();
          currentY = 15;
        }
        
        let titulo = '';
        switch(grafico.tipo) {
          case 'paises': titulo = 'DISTRIBUCIÓN POR PAÍS DE RESIDENCIA'; break;
          case 'satisfaccion': titulo = 'NIVEL DE SATISFACCIÓN'; break;
          case 'genero': titulo = 'DISTRIBUCIÓN POR GÉNERO'; break;
          case 'gasto_pais': titulo = 'GASTO PROMEDIO POR PAÍS'; break;
          case 'ocupacion_tiempo': titulo = 'OCUPACIÓN POR FECHA'; break;
          case 'ocupacion_hotel': titulo = 'OCUPACIÓN POR HOTEL'; break;
          default: titulo = 'DATOS DETALLADOS';
        }
        
        doc.setFontSize(11);
        doc.setTextColor(41, 128, 185);
        doc.text(titulo, 15, currentY);
        currentY += 5;
        
        const tablaDatos = grafico.datos.map((d: any) => {
          if (d.pais) {
            return [d.pais, d.cantidad?.toString() || '0', `${d.porcentaje || 0}%`];
          } else if (d.nivel_satisfaccion) {
            return [`Nivel ${d.nivel_satisfaccion}`, d.cantidad?.toString() || '0', `${d.porcentaje || 0}%`];
          } else if (d.genero) {
            return [d.genero, d.cantidad?.toString() || '0', `${d.porcentaje || 0}%`];
          } else if (d.fecha) {
            return [d.fecha, d.checkin_nacionales?.toString() || '0', `${d.ocupacion_promedio || 0}%`];
          } else if (d.id_hotel) {
            return [`Hotel ${d.id_hotel}`, d.total_registros?.toString() || '0', `${d.ocupacion_promedio || 0}%`];
          }
          return [Object.values(d)[0]?.toString() || '', Object.values(d)[1]?.toString() || '0', ''];
        });
        
        autoTable(doc, {
          startY: currentY,
          head: grafico.tipo === 'gasto_pais' ? [['País', 'Encuestas', 'Gasto Promedio', 'Mín', 'Máx']] :
                grafico.tipo === 'ocupacion_tiempo' ? [['Fecha', 'Check-ins', 'Ocupación %']] :
                grafico.tipo === 'ocupacion_hotel' ? [['Hotel', 'Registros', 'Ocupación %', 'Tarifa']] :
                [['Categoría', 'Cantidad', 'Porcentaje']],
          body: grafico.tipo === 'gasto_pais' ? 
            grafico.datos.map((d: any) => [d.pais, d.total_encuestas, `$${d.gasto_promedio}`, `$${d.gasto_minimo}`, `$${d.gasto_maximo}`]) :
            grafico.tipo === 'ocupacion_hotel' ?
            grafico.datos.map((d: any) => [`Hotel ${d.id_hotel}`, d.total_registros, `${d.ocupacion_promedio}%`, `$${d.tarifa_promedio}`]) :
            tablaDatos,
          theme: 'striped',
          headStyles: { fillColor: [46, 204, 113], textColor: 255 },
          styles: { fontSize: 8 },
          columnStyles: grafico.tipo === 'gasto_pais' ? 
            { 0: { cellWidth: 70 }, 1: { cellWidth: 40 }, 2: { cellWidth: 50 }, 3: { cellWidth: 40 }, 4: { cellWidth: 40 } } :
            { 0: { cellWidth: 100 }, 1: { cellWidth: 60 }, 2: { cellWidth: 60 } }
        });
      }
    }
    
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(150);
      doc.text(
        `Generado: ${new Date().toLocaleString()} | Página ${i} de ${pageCount}`,
        140,
        doc.internal.pageSize.getHeight() - 8,
        { align: 'center' }
      );
    }
    
    const nombreArchivo = `reporte-${proceso.id_etl}-${new Date().toISOString().split('T')[0]}.pdf`;
    doc.save(nombreArchivo);
    console.log('📄 Reporte PDF generado:', nombreArchivo);
  }

  // ==========================================
  // MÉTODOS EXISTENTES
  // ==========================================

  async confirmarEliminar(id: number) {
    const alerta = await this.alertController.create({
      header: 'Confirmar',
      message: '¿Estás seguro de eliminar este registro del historial?',
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Eliminar',
          role: 'destructive',
          handler: () => {
            this.etlService.eliminarRegistro(id).subscribe({
              next: () => {
                this.cargarHistorial();
                this.cargarEstadoProcesos();
              },
              error: (err) => window.alert(err.error?.error || 'Error al eliminar')
            });
          }
        }
      ]
    });
    await alerta.present();
  }

  reintentar(id: number) {
    this.etlService.reintentarProceso(id).subscribe({
      next: () => {
        this.cargarHistorial();
        this.cargarEstadoProcesos();
      },
      error: (err) => alert(err.error?.error || 'Error al reintentar')
    });
  }

  cancelarProgramacion(id: number) {
    this.etlService.cancelarEjecucion(id).subscribe({
      next: () => this.cargarEjecucionesProgramadas(),
      error: (err) => alert(err.error?.error || 'Error al cancelar')
    });
  }

  getEstadoClass(estado: string): string {
    const map: any = {
      'COMPLETADO': 'completado',
      'EN_PROCESO': 'procesando',
      'ERROR': 'error',
      'PROGRAMADO': 'programado',
      'CANCELADO': 'cancelado'
    };
    return map[estado] || '';
  }
}