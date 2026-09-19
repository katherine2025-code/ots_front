import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { Router, ActivatedRoute } from '@angular/router';
import { EncuestaService, PreguntaEncuesta, TipoEncuesta } from 'src/app/core/services/encuesta.service';
import { RespuestaService } from 'src/app/core/services/respuesta.service';

@Component({
  selector: 'app-responder-encuesta',
  templateUrl: './responder-encuesta.page.html',
  styleUrls: ['./responder-encuesta.page.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule]
})
export class ResponderEncuestaPage implements OnInit {
  tipoEncuesta: TipoEncuesta = 'turista';
  respuestas: any = {};
  // Las preguntas (y sus respuestas posibles) vienen de la base de datos,
  // donde el administrador las edita desde "Gestión de Encuestas".
  preguntas: PreguntaEncuesta[] = [];
  private tipoCargado?: TipoEncuesta;
  cargando: boolean = false;
  errorCarga: string = '';
  guardando: boolean = false;
  exportando: boolean = false;

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private encuestaService: EncuestaService,
    private respuestaService: RespuestaService
  ) {}

  ngOnInit() {
    this.respuestaService.sincronizarPendientes();
    const tipo = this.route.snapshot.paramMap.get('tipo');
    this.tipoEncuesta = (tipo === 'hotel') ? 'hotel' : 'turista';
    this.cargarPreguntas();
  }

  cambiarTipo(valor: string | number | undefined) {
    // ngModel ya pudo haber actualizado tipoEncuesta: se compara contra lo cargado
    if (valor !== 'turista' && valor !== 'hotel') return;
    if (valor === this.tipoCargado) return;
    this.tipoEncuesta = valor;
    this.respuestas = {};
    this.cargarPreguntas();
  }

  private cargarPreguntas() {
    this.tipoCargado = this.tipoEncuesta;
    this.cargando = true;
    this.errorCarga = '';
    this.preguntas = [];

    this.encuestaService.getEncuestaPorTipo(this.tipoEncuesta).subscribe({
      next: (encuesta) => {
        this.preguntas = encuesta.preguntas || [];
        this.cargando = false;
      },
      error: (err) => {
        this.errorCarga = err.message;
        this.cargando = false;
      }
    });
  }

  obtenerSecciones(): string[] {
    const secciones = new Set<string>();
    this.preguntas.forEach(p => secciones.add(p.seccion));
    return Array.from(secciones);
  }

  getPreguntasPorSeccion(seccion: string): PreguntaEncuesta[] {
    return this.preguntas.filter(p => p.seccion === seccion);
  }

  async guardarRespuestas() {
    // Validar campos obligatorios
    const obligatorias = this.preguntas.filter(p => p.obligatoria);
    const faltantes = obligatorias.filter(p => {
      const valor = this.respuestas[p.codigo];
      // 0 es una respuesta válida en preguntas numéricas
      return valor === undefined || valor === null || valor === '' || (Array.isArray(valor) && valor.length === 0);
    });

    if (faltantes.length > 0) {
      alert(` Faltan ${faltantes.length} preguntas obligatorias por responder`);
      return;
    }

    this.guardando = true;

    try {
      const estado = await this.respuestaService.registrar(this.tipoEncuesta, this.respuestas);

      if (estado === 'enviada') {
        alert(' Respuestas guardadas exitosamente');
      } else {
        alert(' Sin conexión con el servidor: la encuesta quedó guardada en este dispositivo y se enviará automáticamente cuando haya conexión.');
      }
      this.router.navigate(['/mis-encuestas']);
    } catch (error: any) {
      console.error('Error al guardar:', error);
      alert(` Error al guardar las respuestas: ${error.message}`);
    } finally {
      this.guardando = false;
    }
  }

  async exportarCSV() {
    this.exportando = true;

    try {
      // Mismo formato que la descarga del administrador, para que el módulo ETL lo lea igual
      const escapar = (valor: any): string => {
        const texto = Array.isArray(valor) ? valor.join(' | ') : String(valor ?? '');
        return /[;"\n\r]/.test(texto) ? `"${texto.replace(/"/g, '""')}"` : texto;
      };
      const ahora = new Date();
      const p2 = (n: number) => String(n).padStart(2, '0');
      const fechaLocal = `${ahora.getFullYear()}-${p2(ahora.getMonth() + 1)}-${p2(ahora.getDate())} ` +
        `${p2(ahora.getHours())}:${p2(ahora.getMinutes())}:${p2(ahora.getSeconds())}`;

      const headers = ['fecha_encuesta', 'tipo_encuesta', ...this.preguntas.map(p => p.codigo)];
      const row = [
        fechaLocal,
        this.tipoEncuesta,
        ...this.preguntas.map(p => this.respuestas[p.codigo] ?? '')
      ].map(escapar);

      const csvContent = '﻿' + [headers.join(';'), row.join(';')].join('\r\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);

      link.setAttribute('href', url);
      const nombreArchivo = `encuesta_${this.tipoEncuesta}_${new Date().getTime()}.csv`;
      link.setAttribute('download', nombreArchivo);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      alert(`CSV exportado exitosamente: ${nombreArchivo}\n\nAhora puede subir este archivo al módulo ETL`);
    } catch (error) {
      console.error('Error al exportar:', error);
      alert('Error al exportar CSV');
    } finally {
      this.exportando = false;
    }
  }

  volver() {
    this.router.navigate(['/mis-encuestas']);
  }
}
