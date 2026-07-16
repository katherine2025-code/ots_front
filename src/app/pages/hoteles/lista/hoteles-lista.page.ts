import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { HotelService } from 'src/app/core/services/hotel.service';
import { HeaderComponent } from 'src/app/shared/components/header/header.component';

@Component({
  selector: 'app-hoteles-lista',
  templateUrl: './hoteles-lista.page.html',
  styleUrls: ['./hoteles-lista.page.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule, HeaderComponent]
})
export class HotelesListaPage implements OnInit {
  hoteles: any[] = [];

  constructor(private hotelService: HotelService) {}

  ngOnInit() {
    this.cargarHoteles();
  }

  cargarHoteles() {
    this.hotelService.getHoteles().subscribe({
      next: (data: any[]) => this.hoteles = data,
      error: (err: any) => console.error(err)
    });
  }
}