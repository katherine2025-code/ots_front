// src/app/core/services/usuario.service.ts
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';

export interface Usuario {
    id_usuario: number;
    nombres: string;
    apellidos: string;
    correo: string;
    id_rol: number;
    estado: number;
    fecha_creacion?: string;
}

export interface CrearUsuarioDto {
    nombres: string;
    apellidos: string;
    correo: string;
    password: string;
    id_rol: number;
}

export interface ActualizarUsuarioDto {
    nombres?: string;
    apellidos?: string;
    correo?: string;
    password?: string;
    id_rol?: number;
    estado?: number;
}

@Injectable({
    providedIn: 'root'
})
export class UsuarioService {

    constructor(private api: ApiService) { }

    /**
     * Obtener todos los usuarios
     * ✅ SIN barra al inicio
     */
    getUsuarios(): Observable<Usuario[]> {
        return this.api.get<Usuario[]>('usuarios');  // ← Sin barra al inicio
    }

    /**
     * Obtener un usuario por ID
     */
    getUsuarioById(id: number): Observable<Usuario> {
        return this.api.get<Usuario>(`usuarios/${id}`);  // ← Sin barra al inicio
    }

    /**
     * Crear un nuevo usuario
     */
    crearUsuario(data: CrearUsuarioDto): Observable<any> {
        return this.api.post('usuarios', data);  // ← Sin barra al inicio
    }

    /**
     * Actualizar un usuario existente
     */
    actualizarUsuario(id: number, data: ActualizarUsuarioDto): Observable<any> {
        return this.api.put(`usuarios/${id}`, data);  // ← Sin barra al inicio
    }

    /**
     * Eliminar un usuario
     */
    eliminarUsuario(id: number): Observable<any> {
        return this.api.delete(`usuarios/${id}`);  // ← Sin barra al inicio
    }

    /**
     * Cambiar contraseña de un usuario
     */
    cambiarPassword(id: number, passwordActual: string, passwordNueva: string): Observable<any> {
        return this.api.patch(`usuarios/${id}/password`, {  // ← Sin barra al inicio
            passwordActual,
            passwordNueva
        });
    }

    /**
     * Obtener bitácora de un usuario
     */
    getBitacora(idUsuario: number): Observable<any[]> {
        return this.api.get(`usuarios/${idUsuario}/bitacora`);  // ← Sin barra al inicio
    }
}           