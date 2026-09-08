import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { HotelService } from 'src/app/core/services/hotel.service';

@Component({
  selector: 'app-hotel-detalle',
  templateUrl: './hotel-detalle.page.html',
  styleUrls: ['./hotel-detalle.page.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule, RouterLink]
})
export class HotelDetallePage implements OnInit {
  hotelId: number = 0;
  hotel: any = null;
  loading: boolean = true;

  constructor(
    private route: ActivatedRoute,
    private hotelService: HotelService
  ) { }

  ngOnInit() {
    this.hotelId = Number(this.route.snapshot.paramMap.get('id'));
    if (this.hotelId) {
      this.cargarHotel();
    } else {
      this.loading = false;
    }
  }

  cargarHotel() {
    this.loading = true;
    this.hotelService.getHotelById(this.hotelId).subscribe({
      next: (data: any) => {
        this.hotel = data;
        this.loading = false;
      },
      error: (err: any) => {
        console.error('Error al cargar hotel:', err);
        this.loading = false;
        this.hotel = null;
      }
    });
  }

  // Método para generar estrellas según categoría
  getEstrellas(categoria: string): number[] {
    const num = parseInt(categoria) || 0;
    return Array(num).fill(0);
  }
}