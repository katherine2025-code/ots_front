export interface Hotel {
  id_hotel: number;
  nombre: string;
  direccion: string;
  correo: string;
  telefono: string;
  tipo: string;
  parroquia: string;
  habitaciones_disponibles: number;
  plazas_disponibles: number;
  estado: number;
  fecha_registro: Date;
}