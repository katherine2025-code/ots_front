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

export interface FeriadoLugares extends GrupoLugares {
  feriado: string;
}

export interface MapaLugares {
  // Los 7 feriados del calendario oficial, siempre en este orden, cada uno con su análisis real
  // (0 encuestas si todavía no se ha recolectado nada para ese feriado - ver ocupación por feriado).
  feriados: FeriadoLugares[];
  // Encuestas cuya fecha no cae dentro del margen de ningún feriado oficial.
  sinFeriado: GrupoLugares;
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
