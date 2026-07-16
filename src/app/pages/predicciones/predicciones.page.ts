import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { PrediccionService } from 'src/app/core/services/prediccion.service';
import { HeaderComponent } from 'src/app/shared/components/header/header.component';

@Component({
  selector: 'app-predicciones',
  templateUrl: './predicciones.page.html',
  styleUrls: ['./predicciones.page.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule, HeaderComponent]
})
export class PrediccionesPage implements OnInit {
  predicciones: any[] = [];

  constructor(private prediccionService: PrediccionService) {}

  ngOnInit() {
    this.cargarPredicciones();
  }

  cargarPredicciones() {
    this.prediccionService.getPredicciones().subscribe({
      next: (data: any[]) => this.predicciones = data,
      error: (err: any) => console.error(err)
    });
  }
}