import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from 'src/app/auth/services/auth.service';

/**
 * Reserve l'espace surveillant au role supervisor. L'admin y accede aussi :
 * comme pour les espaces manager et tresorier, il supervise l'ensemble des
 * roles.
 */
export const SupervisorGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  const user = authService.getCurrentUserSync();
  const role = user?.role?.toLowerCase() ?? '';

  if (role === 'admin' || role === 'supervisor') {
    return true;
  }

  router.navigate(['/unauthorized']);
  return false;
};
