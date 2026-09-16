export const ROLES = {
  ADMIN: 1,
  INVESTIGADOR: 2,
  ENCUESTADOR: 3
} as const;

export const NOMBRES_ROL: Record<number, string> = {
  [ROLES.ADMIN]: 'Administrador',
  [ROLES.INVESTIGADOR]: 'Investigador',
  [ROLES.ENCUESTADOR]: 'Encuestador'
};

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