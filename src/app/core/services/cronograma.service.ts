import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';

export type EstadoDia = 'libre' | 'pendiente' | 'hoy' | 'cumplida' | 'incompleta';

export interface JornadaResumen {
  id: number;
  feriado: string;
  fechaInicio: string;
  fechaFin: string;
  encuestadores: number;
  estado: 'programada' | 'en_curso' | 'finalizada';
}

export interface DiaMiCronograma {
  fecha: string;
  esHoy: boolean;
  estado: EstadoDia;
  metaTurista: number;
  metaHotel: number;
  hechoTurista: number;
  hechoHotel: number;
}

export interface MiCronograma {
  hoy: string;
  jornada: { id: number; feriado: string; fechaInicio: string; fechaFin: string } | null;
  dias?: DiaMiCronograma[];
  hoyDia?: DiaMiCronograma | null;
  totales?: { meta: number; hecho: number };
}

export interface CeldaAvance {
  metaTurista: number;
  metaHotel: number;
  hechoTurista: number;
  hechoHotel: number;
}

export interface FilaEncuestador {
  id: number;
  nombre: string;
  sinAsignar: boolean;
  dias: Record<string, CeldaAvance>;
  metaTotal: number;
  hechoTotal: number;
  metaHoy: number;
  hechoHoy: number;
}

export interface AvanceJornada {
  estado?: 'programada' | 'en_curso' | 'finalizada';
  actualizado: string;
  hoy: string;
  jornada: { id: number; feriado: string; fechaInicio: string; fechaFin: string };
  dias: string[];
  encuestadores: FilaEncuestador[];
  totales: { meta: number; hecho: number; metaHoy: number; hechoHoy: number };
}

export interface NuevaJornada {
  feriado: string;
  fecha_inicio: string;
  dias: number;
  encuestadores: number[];
  meta_turista: number;
  meta_hotel: number;
}

@Injectable({
  providedIn: 'root'
})
export class CronogramaService {
  constructor(private api: ApiService) {}

  // Encuestador (solo lectura)
  getMiCronograma(): Observable<MiCronograma> {
    return this.api.get<MiCronograma>('cronograma/mi');
  }

  // Resumen de la jornada en curso para el dashboard (admin, super_admin e investigador)
  getResumen(): Observable<AvanceJornada | { jornada: null }> {
    return this.api.get<AvanceJornada | { jornada: null }>('cronograma/resumen');
  }

  // Super Administrador / Administrador
  getEncuestadores(): Observable<{ id: number; nombre: string }[]> {
    return this.api.get<{ id: number; nombre: string }[]>('cronograma/encuestadores');
  }

  getJornadas(): Observable<JornadaResumen[]> {
    return this.api.get<JornadaResumen[]>('cronograma/jornadas');
  }

  crearJornada(datos: NuevaJornada): Observable<{ id: number }> {
    return this.api.post<{ id: number }>('cronograma/jornadas', datos);
  }

  getAvance(idJornada: number): Observable<AvanceJornada> {
    return this.api.get<AvanceJornada>(`cronograma/jornadas/${idJornada}/avance`);
  }

  actualizarMeta(idJornada: number, datos: { id_usuario: number; fecha: string; meta_turista: number; meta_hotel: number }) {
    return this.api.put<{ ok: boolean }>(`cronograma/jornadas/${idJornada}/meta`, datos);
  }

  agregarEncuestador(idJornada: number, datos: { id_usuario: number; meta_turista: number; meta_hotel: number }) {
    return this.api.post<{ ok: boolean }>(`cronograma/jornadas/${idJornada}/encuestadores`, datos);
  }

  eliminarJornada(idJornada: number) {
    return this.api.delete<{ ok: boolean }>(`cronograma/jornadas/${idJornada}`);
  }
}
