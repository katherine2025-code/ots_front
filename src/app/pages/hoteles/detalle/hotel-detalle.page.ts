import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { ActivatedRoute } from '@angular/router';
import { HotelService } from 'src/app/core/services/hotel.service';

@Component({
  selector: 'app-hotel-detalle',
  template: `
    <ion-header>
      <ion-toolbar color="primary">
        <ion-buttons slot="start">
          <ion-back-button defaultHref="/hoteles"></ion-back-button>
        </ion-buttons>
        <ion-title>Detalle Hotel</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding">
      <ion-card *ngIf="hotel">
        <ion-card-header>
          <ion-card-title>{{ hotel.nombre }}</ion-card-title>
          <ion-card-subtitle>{{ hotel.tipo }}</ion-card-subtitle>
        </ion-card-header>
        <ion-card-content>
          <p><strong>Dirección:</strong> {{ hotel.direccion }}</p>
          <p><strong>Teléfono:</strong> {{ hotel.telefono }}</p>
          <p><strong>Parroquia:</strong> {{ hotel.parroquia }}</p>
          <p><strong>Habitaciones:</strong> {{ hotel.habitaciones_disponibles }}</p>
          <p><strong>Plazas:</strong> {{ hotel.plazas_disponibles }}</p>
        </ion-card-content>
      </ion-card>
    </ion-content>
  `,
  styleUrls: ['./hotel-detalle.page.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule]
})
export class HotelDetallePage implements OnInit {
  hotelId: number = 0;
  hotel: any = {};

  constructor(
    private route: ActivatedRoute,
    private hotelService: HotelService
  ) {}

  ngOnInit() {
    // ✅ CORRECCIÓN: usar .get('id') en lugar de ['id']
    this.hotelId = Number(this.route.snapshot.paramMap.get('id'));
    this.cargarHotel();
  }

  cargarHotel() {
    this.hotelService.getHotelById(this.hotelId).subscribe({
      next: (data: any) => this.hotel = data,
      error: (err: any) => console.error(err)
    });
  }
}