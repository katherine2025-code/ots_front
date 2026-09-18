import { inject } from '@angular/core';
import { Router, type CanActivateFn } from '@angular/router';
import { AuthService } from '../services/auth.service';

//Guard para Super Administrador (control total: cuentas admin, bitácora completa)
export const superAdminGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (!authService.isAuthenticated()) {
    router.navigate(['/login']);
    return false;
  }

  if (!authService.isSuperAdmin()) {
    router.navigate(['/dashboard']);
    return false;
  }

  return true;
};

//Guard para Administrador (incluye Super Administrador, que hereda todo)
export const adminGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (!authService.isAuthenticated()) {
    router.navigate(['/login']);
    return false;
  }

  if (!authService.isAdmin()) {
    router.navigate(['/dashboard']);
    return false;
  }

  return true;
};

//Guard para Investigador
export const investigadorGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (!authService.isAuthenticated()) {
    router.navigate(['/login']);
    return false;
  }

  if (!authService.isInvestigador()) {
    router.navigate(['/dashboard']);
    return false;
  }

  return true;
};

//Guard para Admin o Investigador
export const adminOInvestigadorGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (!authService.isAuthenticated()) {
    router.navigate(['/login']);
    return false;
  }

  // Incluye Super Administrador (0), que hereda todo lo de Administrador.
  // Si falla, el único rol restante hoy es Encuestador -> a su propia home,
  // NUNCA a /dashboard (crearía un bucle de redirección, ya que esta misma
  // guardia protege esa ruta).
  if (!authService.hasAlgunRol([0, 1, 2])) {
    router.navigate(['/mis-encuestas']);
    return false;
  }

  return true;
};

//Guard para Encuestador
export const encuestadorGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (!authService.isAuthenticated()) {
    router.navigate(['/login']);
    return false;
  }

  if (!authService.isEncuestador()) {
    router.navigate(['/dashboard']);
    return false;
  }

  return true;
};