import { inject } from '@angular/core';
import { Router, type CanActivateFn } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const noAuthGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  console.log('[NoAuthGuard] Verificando si usuario está autenticado...');
  console.log('[NoAuthGuard] isAuthenticated:', authService.isAuthenticated());

  // Si está autenticado, redirigir al dashboard
  if (authService.isAuthenticated()) {
    console.log('[NoAuthGuard] Usuario autenticado, redirigiendo a dashboard');
    router.navigate(['/dashboard']);
    return false;
  }

  console.log('[NoAuthGuard] Usuario NO autenticado, permitiendo acceso a login');
  return true;
};