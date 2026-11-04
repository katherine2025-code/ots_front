import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, tap } from 'rxjs';
import { ApiService } from './api.service';
import { StorageService } from './storage.service';
import { Usuario, LoginRequest, AuthResponse } from '../models/usuario.model';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private currentUserSubject = new BehaviorSubject<Usuario | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable();

  constructor(
    private api: ApiService,
    private storage: StorageService
  ) {
    this.loadUserFromStorage();
  }

  // MÉTODO LOGIN
  login(credentials: LoginRequest): Observable<AuthResponse> {
    return this.api.post<AuthResponse>('auth/login', credentials).pipe(
      tap(response => {
        this.storage.set('token', response.token);
        this.storage.set('usuario', JSON.stringify(response.usuario));
        this.currentUserSubject.next(response.usuario);
      })
    );
  }

  // MÉTODO REGISTRO
  registro(data: {
    nombres: string;
    apellidos: string;
    correo: string;
    password: string;
    id_rol?: number;
  }): Observable<any> {
    return this.api.post<any>('auth/registro', data);
  }

  // MÉTODO OLVIDÉ MI CONTRASEÑA (solicita el enlace por correo)
  olvidePassword(correo: string): Observable<{ mensaje: string }> {
    return this.api.post<{ mensaje: string }>('auth/olvide-password', { correo });
  }

  // MÉTODO RESETEAR CONTRASEÑA (con el token que llegó al correo)
  resetPassword(token: string, password: string): Observable<{ mensaje: string }> {
    return this.api.post<{ mensaje: string }>('auth/reset-password', { token, password });
  }

  // MÉTODO CAMBIAR CONTRASEÑA (usuario autenticado; el backend verifica la actual)
  cambiarPassword(passwordActual: string, passwordNueva: string): Observable<{ mensaje: string }> {
    return this.api.put<{ mensaje: string }>('auth/cambiar-password', {
      password_actual: passwordActual,
      password_nueva: passwordNueva
    });
  }

  // MÉTODO LOGOUT
  logout(): void {
    this.storage.remove('token');
    this.storage.remove('usuario');
    this.currentUserSubject.next(null);
  }

  // MÉTODO GET TOKEN
  getToken(): string | null {
    return this.storage.get('token');
  }

  // MÉTODO GET CURRENT USER
  getCurrentUser(): Usuario | null {
    return this.currentUserSubject.value;
  }

  // MÉTODO IS AUTHENTICATED
  // La sesión sigue viva entre recargas mientras el token no haya caducado
  // (el backend lo emite con JWT_EXPIRES_IN, 24h por defecto). Si caducó, se cierra aquí.
  isAuthenticated(): boolean {
    const token = this.getToken();
    if (!token) return false;
    if (this.tokenExpirado(token)) {
      this.logout();
      return false;
    }
    return true;
  }

  private tokenExpirado(token: string): boolean {
    try {
      const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
      const payload = JSON.parse(atob(base64));
      return typeof payload.exp === 'number' && payload.exp * 1000 <= Date.now();
    } catch {
      return true;  // token ilegible: se trata como no válido
    }
  }

  // Verificar si es Super Administrador (id_rol = 0)
  isSuperAdmin(): boolean {
    const user = this.getCurrentUser();
    return user?.id_rol === 0;
  }

  // Verificar si es administrador (id_rol = 1). Super Administrador (0)
  // hereda todo lo que puede hacer un administrador, así que también cuenta.
  isAdmin(): boolean {
    const user = this.getCurrentUser();
    return user?.id_rol === 1 || user?.id_rol === 0;
  }

  // Verificar si es investigador (id_rol = 2)
  isInvestigador(): boolean {
    const user = this.getCurrentUser();
    return user?.id_rol === 2;
  }

  // Verificar si es encuestador (id_rol = 3)
  isEncuestador(): boolean {
    const user = this.getCurrentUser();
    return user?.id_rol === 3;
  }

  // Obtener nombre del rol
  getRolNombre(): string {
    const user = this.getCurrentUser();
    if (user?.id_rol === 0) return 'Super Administrador';
    if (user?.id_rol === 1) return 'Administrador';
    if (user?.id_rol === 2) return 'Investigador';
    if (user?.id_rol === 3) return 'Encuestador';
    return 'Usuario';
  }

  // Verificar si tiene un rol específico
  hasRol(rolId: number): boolean {
    const user = this.getCurrentUser();
    return user?.id_rol === rolId;
  }

  // Verificar si tiene alguno de los roles
  hasAlgunRol(roles: number[]): boolean {
    const user = this.getCurrentUser();
    return user ? roles.includes(user.id_rol) : false;
  }

  // MÉTODO LOAD USER FROM STORAGE
  private loadUserFromStorage(): void {
    const usuarioStr = this.storage.get('usuario');
    if (usuarioStr) {
      try {
        this.currentUserSubject.next(JSON.parse(usuarioStr));
      } catch (e) {
        console.error('Error al cargar usuario:', e);
      }
    }
  }
}