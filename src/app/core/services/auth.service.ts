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
        console.log('[AuthService] Response del login:', response);
        console.log('[AuthService] Token:', response.token);
        console.log('[AuthService] Usuario:', response.usuario);

        // Guardar en Ionic Storage
        this.storage.set('token', response.token);
        this.storage.set('usuario', JSON.stringify(response.usuario));
        
        // TAMBIÉN guardar en localStorage (para el interceptor)
        localStorage.setItem('token', response.token);
        localStorage.setItem('usuario', JSON.stringify(response.usuario));
        
        console.log('[AuthService] Token guardado en ambos almacenamientos');
        
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

  // MÉTODO LOGOUT
  logout(): void {
    // Eliminar de ambos almacenamientos
    this.storage.remove('token');
    this.storage.remove('usuario');
    localStorage.removeItem('token');
    localStorage.removeItem('usuario');
    
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
  isAuthenticated(): boolean {
    return !!this.getToken();
  }

  // Verificar si es administrador (id_rol = 1)
  isAdmin(): boolean {
    const user = this.getCurrentUser();
    return user?.id_rol === 1;
  }

  // Verificar si es investigador (id_rol = 2)
  isInvestigador(): boolean {
    const user = this.getCurrentUser();
    return user?.id_rol === 2;
  }

  // Obtener nombre del rol
  getRolNombre(): string {
    const user = this.getCurrentUser();
    if (user?.id_rol === 1) return 'Administrador';
    if (user?.id_rol === 2) return 'Investigador';
    if (user?.id_rol === 3) return 'Analista';
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