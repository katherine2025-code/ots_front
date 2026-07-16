import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';

@Injectable({
  providedIn: 'root'
})
export class HotelService {
  constructor(private api: ApiService) {}

  getHoteles(): Observable<any[]> {
    return this.api.get<any[]>('hoteles');
  }

  getHotelById(id: number): Observable<any> {
    return this.api.get<any>(`hoteles/${id}`);
  }

  createHotel(hotel: any): Observable<any> {
    return this.api.post<any>('hoteles', hotel);
  }

  updateHotel(id: number, hotel: any): Observable<any> {
    return this.api.put<any>(`hoteles/${id}`, hotel);
  }

  deleteHotel(id: number): Observable<void> {
    return this.api.delete<void>(`hoteles/${id}`);
  }

  getOcupacionHotel(id: number, fechaInicio: string, fechaFin: string): Observable<any[]> {
    return this.api.get<any[]>(`hoteles/${id}/ocupacion`, {
      fecha_inicio: fechaInicio,
      fecha_fin: fechaFin
    });
  }
}