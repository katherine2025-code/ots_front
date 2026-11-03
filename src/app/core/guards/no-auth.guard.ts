import { inject } from '@angular/core';
import { Router, type CanActivateFn } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const noAuthGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);


  // Si está autenticado, redirigir a su home según el rol (Encuestador no
  // tiene Dashboard, evita el rebote doble por adminOInvestigadorGuard).
  if (authService.isAuthenticated()) {
    const destino = authService.isEncuestador() ? '/mis-encuestas' : '/dashboard';
    router.navigate([destino]);
    return false;
  }

  return true;
};