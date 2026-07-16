export interface Ocupacion {
  id_ocupacion: number;
  id_hotel: number;
  id_clima?: number;
  id_feriado?: number;
  fecha: Date;
  habitaciones_disponibles: number;
  habitaciones_ocupadas: number;
  plazas_disponibles: number;
  plazas_ocupadas: number;
  porcentaje_ocupacion: number;
  checkin_nacionales: number;
  checkin_extranjeros: number;
  checkout_nacionales: number;
  checkout_extranjeros: number;
  tarifa_promedio: number;
  ingresos_totales: number;
  origen_reservas?: string;
  observaciones?: string;
}