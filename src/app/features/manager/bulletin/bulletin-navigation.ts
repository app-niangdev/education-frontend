import { Router } from '@angular/router';

import { aireCourante } from 'src/app/core/navigation/aire-courante';

/**
 * Comme pour les eleves, l'identifiant du bulletin transite par le state du
 * Router et non par l'URL : ces routes n'exposent aucun parametre.
 *
 * L'ecran est partage entre l'espace manager et l'espace surveillant (qui
 * consulte sans pouvoir generer ni publier) : le segment d'aire est resolu a
 * l'execution pour que la navigation reste dans l'espace de l'utilisateur.
 */
export const ROUTE_BULLETINS = (router: Router): string =>
  `/index/${aireCourante(router)}/report-cards`;
export const ROUTE_BULLETIN_DETAIL = (router: Router): string =>
  `/index/${aireCourante(router)}/report-cards/detail`;

/** Cles uniques du state, pour eviter toute collision entre navigations. */
export const STATE_BULLETIN_ID = 'bulletinId';
export const STATE_BULLETIN_CONTEXTE = 'bulletinContexte';

/**
 * Classe et periode selectionnees dans la liste. On les transporte jusqu'au
 * detail pour que le retour arriere retrouve le meme filtrage, sans quoi
 * l'utilisateur devrait re-selectionner sa classe a chaque aller-retour.
 */
export interface BulletinContexte {
  classeId: number | null;
  periodeId: number | null;
}

interface BulletinState {
  [STATE_BULLETIN_ID]?: unknown;
  [STATE_BULLETIN_CONTEXTE]?: unknown;
}

/**
 * Lit l'identifiant depuis le state de navigation.
 *
 * `getCurrentNavigation()` n'est renseigne que pendant la navigation (donc
 * dans le constructeur) ; `history.state` lui survit et couvre ngOnInit, les
 * retours arriere ET les rafraichissements. On tente les deux sources.
 *
 * Retourne null uniquement si aucun state n'a jamais ete pose (URL saisie ou
 * collee directement) : l'appelant revient alors a la liste.
 */
export function lireBulletinIdDepuisState(router: Router): number | null {
  const navigation = router.getCurrentNavigation()?.extras?.state as BulletinState | undefined;
  const historique = (typeof history !== 'undefined' ? history.state : null) as BulletinState | null;

  return versId(navigation?.[STATE_BULLETIN_ID]) ?? versId(historique?.[STATE_BULLETIN_ID]);
}

/** Le couple classe/periode d'ou vient l'utilisateur, s'il a ete transmis. */
export function lireContexteDepuisState(router: Router): BulletinContexte | null {
  const navigation = router.getCurrentNavigation()?.extras?.state as BulletinState | undefined;
  const historique = (typeof history !== 'undefined' ? history.state : null) as BulletinState | null;

  const brut = (navigation?.[STATE_BULLETIN_CONTEXTE] ??
    historique?.[STATE_BULLETIN_CONTEXTE]) as Partial<BulletinContexte> | undefined;

  if (!brut) {
    return null;
  }

  return {
    classeId: versId(brut.classeId),
    periodeId: versId(brut.periodeId)
  };
}

function versId(valeur: unknown): number | null {
  const id = Number(valeur);

  return Number.isInteger(id) && id > 0 ? id : null;
}
