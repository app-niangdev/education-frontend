import { Router } from '@angular/router';

import { CreneauDuJour } from 'src/app/interfaces/Assiduite';

/**
 * Le creneau et la date transitent par le state du Router, comme partout
 * ailleurs dans l'application : les routes restent statiques, sans parametre.
 */
export const ROUTE_MES_CRENEAUX = '/index/teacher/attendance';
export const ROUTE_FEUILLE_APPEL = '/index/teacher/attendance/feuille';

export const STATE_CRENEAU = 'creneau';
export const STATE_DATE_APPEL = 'dateAppel';

interface AppelState {
  [STATE_CRENEAU]?: unknown;
  [STATE_DATE_APPEL]?: unknown;
}

/**
 * Lit le creneau et la date depuis le state de navigation.
 *
 * `getCurrentNavigation()` n'est renseigne que pendant la navigation (donc
 * dans le constructeur) ; `history.state` lui survit et couvre ngOnInit, les
 * retours arriere ET les rafraichissements. On tente les deux sources.
 *
 * Retourne null si aucun state n'a jamais ete pose (URL collee directement) :
 * l'appelant revient alors a la liste des creneaux.
 */
export function lireAppelDepuisState(
  router: Router
): { creneau: CreneauDuJour; date: string } | null {
  const navigation = router.getCurrentNavigation()?.extras?.state as AppelState | undefined;
  const historique = (typeof history !== 'undefined' ? history.state : null) as AppelState | null;

  const creneau = (navigation?.[STATE_CRENEAU] ?? historique?.[STATE_CRENEAU]) as
    | CreneauDuJour
    | undefined;
  const date = (navigation?.[STATE_DATE_APPEL] ?? historique?.[STATE_DATE_APPEL]) as
    | string
    | undefined;

  if (!creneau?.id || !date) {
    return null;
  }

  return { creneau, date };
}
