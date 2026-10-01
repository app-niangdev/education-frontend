import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from 'src/app/auth/services/auth.service';

/**
 * Réserve la corbeille de messagerie aux agents qui traitent des demandes.
 *
 * L'enseignant en est exclu : le suivi pédagogique passe par les bulletins et
 * les évaluations, pas par un guichet de réclamations. Le tuteur aussi — il a
 * son propre espace, /index/tuteur/messagerie.
 *
 * Ce guard ne fait qu'éviter un aller-retour inutile : c'est
 * ConversationService, côté serveur, qui décide réellement de ce que chacun
 * voit, guichet par guichet.
 */
export const MessagerieGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  const role = authService.getRole();

  if (['admin', 'manager', 'supervisor', 'treasurer'].includes(role)) {
    return true;
  }

  router.navigate(['/unauthorized']);
  return false;
};
