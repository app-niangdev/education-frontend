import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from 'src/app/auth/services/auth.service';

/**
 * Réserve l'espace enseignant au rôle teacher. Le manager et l'admin y
 * accèdent aussi : ils supervisent les évaluations de l'ensemble des classes
 * (la vue est globale pour eux côté backend).
 */
export const TeacherGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  const user = authService.getCurrentUserSync();
  const role = user?.role?.toLowerCase() ?? '';

  if (role === 'admin' || role === 'manager' || role === 'teacher') {
    return true;
  }

  router.navigate(['/unauthorized']);
  return false;
};
