import { inject } from '@angular/core';
import { Router, type CanActivateFn } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  console.log('[AuthGuard] Verificando autenticación...');
  console.log('[AuthGuard] isAuthenticated:', authService.isAuthenticated());

  if (!authService.isAuthenticated()) {
    console.log('[AuthGuard] Usuario NO autenticado, redirigiendo a login');
    router.navigate(['/login']);
    return false;
  }

  console.log('[AuthGuard] Usuario autenticado, permitiendo acceso');
  return true;
};