import { Router } from '@angular/router';

import { aireCourante } from 'src/app/core/navigation/aire-courante';

/**
 * Le registre d'assiduite est partage entre l'espace manager et l'espace
 * surveillant : le segment d'aire est resolu a l'execution pour que la
 * navigation reste dans l'espace de l'utilisateur connecte.
 */
export const ROUTE_ASSIDUITE = (router: Router): string =>
  `/index/${aireCourante(router)}/attendance`;
export const ROUTE_FICHE_ELEVE = (router: Router): string =>
  `/index/${aireCourante(router)}/attendance/eleve`;

/** Cles du state, pour eviter toute collision entre navigations. */
export const STATE_ELEVE_ASSIDUITE = 'eleveAssiduiteId';
export const STATE_FILTRES_ASSIDUITE = 'filtresAssiduite';

/** Les filtres du registre, transportes jusqu'a la fiche et au retour. */
export interface FiltresAssiduite {
  classeId: number | null;
  statut: string | null;
  justifie: boolean | null;
  du: string | null;
  au: string | null;
}

interface AssiduiteState {
  [STATE_ELEVE_ASSIDUITE]?: unknown;
  [STATE_FILTRES_ASSIDUITE]?: unknown;
}

/**
 * Lit l'identifiant de l'eleve depuis le state de navigation.
 *
 * `getCurrentNavigation()` n'est renseigne que pendant la navigation (donc
 * dans le constructeur) ; `history.state` lui survit et couvre ngOnInit, les
 * retours arriere et les rafraichissements. On tente les deux sources.
 */
export function lireEleveAssiduiteDepuisState(router: Router): number | null {
  const navigation = router.getCurrentNavigation()?.extras?.state as AssiduiteState | undefined;
  const historique = (typeof history !== 'undefined' ? history.state : null) as AssiduiteState | null;

  return (
    versId(navigation?.[STATE_ELEVE_ASSIDUITE]) ??
    versId(historique?.[STATE_ELEVE_ASSIDUITE])
  );
}

/** Les filtres d'ou vient l'utilisateur, pour les retrouver au retour. */
export function lireFiltresDepuisState(router: Router): FiltresAssiduite | null {
  const navigation = router.getCurrentNavigation()?.extras?.state as AssiduiteState | undefined;
  const historique = (typeof history !== 'undefined' ? history.state : null) as AssiduiteState | null;

  const brut = (navigation?.[STATE_FILTRES_ASSIDUITE] ??
    historique?.[STATE_FILTRES_ASSIDUITE]) as FiltresAssiduite | undefined;

  return brut ?? null;
}

function versId(valeur: unknown): number | null {
  const id = Number(valeur);

  return Number.isInteger(id) && id > 0 ? id : null;
}
