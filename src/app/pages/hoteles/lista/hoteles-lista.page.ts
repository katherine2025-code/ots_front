import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { RouterLink } from '@angular/router';
import { HotelService } from 'src/app/core/services/hotel.service';

@Component({
  selector: 'app-hoteles-lista',
  templateUrl: './hoteles-lista.page.html',
  styleUrls: ['./hoteles-lista.page.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule, RouterLink]
})
export class HotelesListaPage implements OnInit {
  hoteles: any[] = [];
  loading: boolean = true;

  constructor(private hotelService: HotelService) { }

  ngOnInit() {
    this.cargarHoteles();
  }

  cargarHoteles() {
    this.loading = true;
    this.hotelService.getHoteles().subscribe({
      next: (data: any[]) => {
        this.hoteles = data || [];
        this.loading = false;
      },
      error: (err: any) => {
        console.error('Error al cargar hoteles:', err);
        this.loading = false;
        this.hoteles = [];
      }
    });
  }
}