import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from 'src/app/auth/services/auth.service';

export const AdminGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  const user = authService.getCurrentUserSync();
  const role = user?.role?.toLowerCase() ?? '';

  if (role === 'admin') {
    return true;
  }

  router.navigate(['/unauthorized']);
  return false;
};
