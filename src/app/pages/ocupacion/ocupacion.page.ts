import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { OcupacionService } from 'src/app/core/services/ocupacion.service';
import { HeaderComponent } from 'src/app/shared/components/header/header.component';

@Component({
  selector: 'app-ocupacion',
  templateUrl: './ocupacion.page.html',
  styleUrls: ['./ocupacion.page.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule, HeaderComponent]
})
export class OcupacionPage implements OnInit {
  ocupacion: any[] = [];

  constructor(private ocupacionService: OcupacionService) {}

  ngOnInit() {
    this.cargarOcupacion();
  }

  cargarOcupacion() {
    this.ocupacionService.getOcupacionGeneral().subscribe({
      next: (data: any[]) => this.ocupacion = data,
      error: (err: any) => console.error(err)
    });
  }
}