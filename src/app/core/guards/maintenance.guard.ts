import { inject } from '@angular/core';
import { CanActivateFn, Router, UrlTree } from '@angular/router';
import { map } from 'rxjs';
import { AuthService } from 'src/app/auth/services/auth.service';
import { EtablissementService } from 'src/app/auth/services/etablissement.service';

/**
 * Bloque l'accès quand la plateforme est en maintenance (`en_maintenance`),
 * en redirigeant vers `/maintenance` — SAUF pour un administrateur connecté,
 * qui peut continuer à naviguer pour désactiver la maintenance.
 *
 * L'état de maintenance vient de l'endpoint public `/etablissement/infos`.
 * Tant que le backend ne renvoie pas `en_maintenance`, le guard laisse passer
 * (comportement volontairement « fail-open » pour ne verrouiller personne).
 */
export const maintenanceGuard: CanActivateFn = () => {
  const etablissementService = inject(EtablissementService);
  const authService = inject(AuthService);
  const router = inject(Router);

  const decide = (enMaintenance: boolean | undefined): boolean | UrlTree => {
    if (!enMaintenance) return true;

    const user = authService.getCurrentUserSync();
    const isAdmin = (user?.role?.toLowerCase() ?? '') === 'admin';
    if (authService.isLoggedIn() && isAdmin) return true;

    return router.createUrlTree(['/maintenance']);
  };

  // Utilise l'info déjà chargée si disponible, sinon la récupère.
  const cached = etablissementService.etablissement();
  if (cached) {
    return decide(cached.en_maintenance);
  }

  // En cas d'échec réseau, getInfoEtablissement renvoie null → on ne bloque pas.
  return etablissementService
    .getInfoEtablissement()
    .pipe(map((etab) => decide(etab?.en_maintenance)));
};
