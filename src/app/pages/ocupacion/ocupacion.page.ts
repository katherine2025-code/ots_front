import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { OcupacionService } from 'src/app/core/services/ocupacion.service';

@Component({
  selector: 'app-ocupacion',
  templateUrl: './ocupacion.page.html',
  styleUrls: ['./ocupacion.page.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule]
})
export class OcupacionPage implements OnInit {
  ocupacion: any[] = [];
  loading: boolean = true;

  // Métricas calculadas
  ocupacionPromedio: number = 0;
  ocupacionMaxima: number = 0;
  ocupacionMinima: number = 0;
  totalRegistros: number = 0;

  constructor(private ocupacionService: OcupacionService) { }

  ngOnInit() {
    this.cargarOcupacion();
  }

  cargarOcupacion() {
    this.loading = true;
    this.ocupacionService.getOcupacionGeneral().subscribe({
      next: (data: any[]) => {
        this.ocupacion = data || [];
        this.calcularMetricas();
        this.loading = false;
      },
      error: (err: any) => {
        console.error('Error al cargar ocupación:', err);
        this.loading = false;
        this.ocupacion = [];
      }
    });
  }

  calcularMetricas() {
    if (this.ocupacion.length === 0) {
      this.ocupacionPromedio = 0;
      this.ocupacionMaxima = 0;
      this.ocupacionMinima = 0;
      this.totalRegistros = 0;
      return;
    }

    const valores = this.ocupacion
      .map(item => parseFloat(item.porcentaje_ocupacion) || 0)
      .filter(val => val > 0);

    if (valores.length === 0) {
      this.ocupacionPromedio = 0;
      this.ocupacionMaxima = 0;
      this.ocupacionMinima = 0;
      this.totalRegistros = this.ocupacion.length;
      return;
    }

    this.ocupacionPromedio = valores.reduce((a, b) => a + b, 0) / valores.length;
    this.ocupacionMaxima = Math.max(...valores);
    this.ocupacionMinima = Math.min(...valores);
    this.totalRegistros = this.ocupacion.length;
  }

  getOcupacionClass(valor: number): string {
    if (!valor) return 'low';
    if (valor >= 80) return 'high';
    if (valor >= 50) return 'medium';
    return 'low';
  }

  getOcupacionLabel(valor: number): string {
    if (!valor) return 'Baja';
    if (valor >= 80) return 'Alta';
    if (valor >= 50) return 'Media';
    return 'Baja';
  }
}