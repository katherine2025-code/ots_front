import { inject } from '@angular/core';
import { Router, type CanActivateFn } from '@angular/router';
import { AuthService } from '../services/auth.service';

//Guard para Administrador
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

  if (!authService.hasAlgunRol([1, 2])) {
    router.navigate(['/dashboard']);
    return false;
  }

  return true;
};