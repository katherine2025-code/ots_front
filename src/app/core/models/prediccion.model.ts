export interface Prediccion {
  id_prediccion: number;
  id_usuario: number;
  id_hotel?: number;
  fecha_objetivo: Date;
  fecha_generacion: Date;
  checkin_nacionales: number;
  checkin_extranjeros: number;
  tarifa_cobrada: number;
  temperatura?: number;
  precipitacion?: number;
  total_dias_feriado: number;
  temporada: string;
  mes: number;
  dia_semana: number;
  es_fin_semana: number;
  ocupacion_predicha: number;
  ocupacion_real?: number;
  error_absoluto?: number;
  precision_modelo: number;
  modelo_utilizado: string;
  version_modelo: string;
  intervalo_confianza_min: number;
  intervalo_confianza_max: number;
  tiempo_prediccion_ms: number;
  estado: 'pendiente' | 'validada' | 'descartada';
  observaciones?: string;
}