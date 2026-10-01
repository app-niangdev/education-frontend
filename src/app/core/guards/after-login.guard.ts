import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from 'src/app/auth/services/auth.service';

/**
 * Écarte des écrans publics (connexion, mot de passe oublié…) ceux qui ont
 * déjà une session ouverte.
 *
 * Exception : le changement de mot de passe. Il vit dans le même groupe de
 * routes, mais il ne s'atteint QUE connecté — le serveur exige un jeton pour
 * `POST /auth/change-password`. Sans cette exception, un tuteur dont le mot de
 * passe est encore provisoire serait renvoyé vers /index à chaque tentative,
 * et n'aurait aucun moyen de le changer.
 */
export const afterLoginGuard: CanActivateFn = (_route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (!authService.isLoggedIn()) {
    return true;
  }

  // L'URL demandée plutôt que l'arbre de routes : le garde est posé sur le
  // parent, dont les enfants ne sont pas encore résolus quand il s'exécute.
  if (state.url.startsWith('/change-password')) {
    return true;
  }

  router.navigate(['/index']);
  return false;
};
