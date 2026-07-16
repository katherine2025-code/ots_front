import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { Router } from '@angular/router';

@Component({
  selector: 'app-encuestas-nuevas',
  templateUrl: './encuestas-nuevas.page.html',
  styleUrls: ['./encuestas-nuevas.page.scss'],
  standalone: true,
  imports: [CommonModule, IonicModule]
})
export class EncuestasNuevaPage {
  constructor(private router: Router) {}

  crearDesdeBorrador() {
    this.router.navigate(['/encuestas/editor']);
  }

  usarPlantilla() {
    this.router.navigate(['/encuestas/plantillas']);
  }

  cargarXLSForm() {
    // Implementar subida de archivo XLSForm
    alert('Función para cargar XLSForm de KoboToolbox');
  }

  cancelar() {
    this.router.navigate(['/encuestas']);
  }
}