import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { RouterLink } from '@angular/router';
import { HotelService } from 'src/app/core/services/hotel.service';

// 'todos' muestra todo; los demás filtran por cantón; 'sin' agrupa los que aún no tienen cantón
type FiltroCanton = 'todos' | 'Santa Elena' | 'Salinas' | 'sin';

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
  filtro: FiltroCanton = 'todos';

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

  cambiarFiltro(valor: string | number | undefined) {
    if (valor === 'todos' || valor === 'Santa Elena' || valor === 'Salinas' || valor === 'sin') {
      this.filtro = valor;
    }
  }

  contar(filtro: FiltroCanton): number {
    return this.hoteles.filter(h => this.coincide(h, filtro)).length;
  }

  get hotelesFiltrados(): any[] {
    return this.hoteles.filter(h => this.coincide(h, this.filtro));
  }

  private coincide(hotel: any, filtro: FiltroCanton): boolean {
    if (filtro === 'todos') return true;
    if (filtro === 'sin') return !hotel.canton;
    return hotel.canton === filtro;
  }
}
