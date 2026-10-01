import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from 'src/app/auth/services/auth.service';

/**
 * Réserve l'espace tuteur au rôle tuteur.
 *
 * Contrairement aux autres guards du projet, l'admin et le manager n'y sont
 * PAS admis : cet espace montre les fils d'un tuteur précis, celui rattaché au
 * compte connecté. Un administrateur y entrerait sans fiche tuteur associée et
 * n'y verrait rien — le backend lui renverrait d'ailleurs un 403. Les agents
 * ont leur propre écran, /index/messagerie, qui montre la corbeille du service.
 */
export const TuteurGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.getRole() === 'tuteur') {
    return true;
  }

  router.navigate(['/unauthorized']);
  return false;
};
