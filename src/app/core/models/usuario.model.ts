export interface Usuario {
  telefono: string;
  id_usuario: number;
  id_rol: number;
  nombres: string;
  apellidos: string;
  correo: string;
  estado: number;
  ultimo_acceso?: Date;
  fecha_creacion: Date;
}

export interface LoginRequest {
  correo: string;
  password: string;
}

export interface AuthResponse {
  token: string;
  usuario: Usuario;
}