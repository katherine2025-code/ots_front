import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';

export interface LugarVisita {
  nombre: string;
  visitas: number;
  porcentaje: number;   // % de turistas encuestados que dijeron haber visitado el lugar
  lat: number | null;
  lng: number | null;
  canton: string | null;
}

export interface GrupoLugares {
  encuestas: number;    // turistas encuestados que respondieron lugares visitados
  lugares: LugarVisita[];
}

export interface JornadaLugares extends GrupoLugares {
  id: number;
  feriado: string;
  anio: string;
  fechaInicio: string;
  fechaFin: string;
}

export interface MapaLugares {
  jornadas: JornadaLugares[];
  fueraDeJornada: GrupoLugares;
  todos: GrupoLugares;
  lugaresSinCoordenadas: string[];
}

@Injectable({ providedIn: 'root' })
export class LugaresService {
  constructor(private api: ApiService) {}

  getMapa(): Observable<MapaLugares> {
    return this.api.get<MapaLugares>('lugares/mapa');
  }
}
