import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from 'src/app/auth/services/auth.service';

export const ManagerGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  const user = authService.getCurrentUserSync();
  const role = user?.role?.toLowerCase() ?? '';

  if (role === 'admin' || role === 'manager') {
    return true;
  }

  router.navigate(['/unauthorized']);
  return false;
};
