import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from 'src/app/auth/services/auth.service';

/**
 * Reserve l'espace tresorier au role treasurer. L'admin y accede aussi :
 * comme pour l'espace manager, il supervise l'ensemble des roles.
 */
export const TreasurerGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  const user = authService.getCurrentUserSync();
  const role = user?.role?.toLowerCase() ?? '';

  if (role === 'admin' || role === 'treasurer') {
    return true;
  }

  router.navigate(['/unauthorized']);
  return false;
};
