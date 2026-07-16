import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { Router } from '@angular/router';
import { AuthService } from 'src/app/core/services/auth.service';
import { addIcons } from 'ionicons';
import { createOutline } from 'ionicons/icons';

addIcons ({ 'create-outline' : createOutline });

@Component({
  selector: 'app-encuestas',
  templateUrl: './encuestas.page.html',
  styleUrls: ['./encuestas.page.scss'],
  standalone: true,
  imports: [CommonModule, IonicModule]
})
export class EncuestasPage implements OnInit {
  encuestas: any[] = [
    {
      id: 1,
      nombre: 'Encuesta Turística - Feriados Nacionales',
      tipo: 'turista',
      descripcion: 'Encuesta para obtener información de turistas durante feriados (Perfil sociodemográfico, motivaciones, gasto y satisfacción)',
      preguntas: 25,
      activa: true,
      fechaCreacion: '2026-01-15'
    },
    {
      id: 2,
      nombre: 'Encuesta Establecimientos de Alojamiento - MINTUR',
      tipo: 'hotel',
      descripcion: 'Levantamiento de información en hoteles según Metodología MINTUR (Identificación, capacidad y demanda turística por feriado)',
      preguntas: 14,
      activa: true,
      fechaCreacion: '2026-01-20'
    }
  ];

  totalTuristas: number = 0;
  totalHoteles: number = 0;
  totalActivas: number = 0;
  isAdmin: boolean = false;

  constructor(
    private router: Router,
    private authService: AuthService
  ) {}

  ngOnInit() {
    this.isAdmin = this.authService.isAdmin();
    this.calcularTotales();
  }

  calcularTotales() {
    this.totalTuristas = this.encuestas.filter(e => e.tipo === 'turista').length;
    this.totalHoteles = this.encuestas.filter(e => e.tipo === 'hotel').length;
    this.totalActivas = this.encuestas.filter(e => e.activa).length;
  }

  verDetalles(id: number) {
    this.router.navigate([`/encuestas/detalle/${id}`]);
  }

  nuevaEncuesta() {
    if (!this.isAdmin) {
      alert('Solo los administradores pueden crear encuestas');
      return;
    }
    this.router.navigate(['/encuestas/nueva']);
  }

  editarEncuesta(id: number) {
    if (!this.isAdmin) {
      alert('Solo los administradores pueden editar encuestas');
      return;
    }
    this.router.navigate([`/encuestas/editar/${id}`]);
  }

    responderEncuesta(id: number) {
    const encuesta = this.encuestas.find(e => e.id === id);
    const tipo = encuesta?.tipo === 'hotel' ? 'hotel' : 'turista';
    this.router.navigate([`/responder-encuesta/${tipo}`]);
  }

  activarDesactivar(id: number) {
    if (!this.isAdmin) {
      alert('Solo los administradores pueden activar/desactivar encuestas');
      return;
    }
    const encuesta = this.encuestas.find(e => e.id === id);
    if (encuesta) {
      encuesta.activa = !encuesta.activa;
      this.calcularTotales();
    }
  }
}