import { Router } from '@angular/router';

import { aireCourante } from 'src/app/core/navigation/aire-courante';

/**
 * L'identifiant de l'eleve transite par le state du Router plutot que par
 * l'URL. Ces routes n'exposent donc aucun parametre.
 *
 * Les ecrans eleves/inscriptions sont partages entre l'espace manager et
 * l'espace surveillant : le segment d'aire (`manager` ou `supervisor`) est
 * resolu a l'execution depuis l'URL courante, afin que la navigation reste
 * dans l'espace de l'utilisateur connecte.
 */
export const ROUTE_ELEVES = (router: Router): string =>
  `/index/${aireCourante(router)}/students`;
export const ROUTE_ELEVE_DETAIL = (router: Router): string =>
  `/index/${aireCourante(router)}/students/detail`;
export const ROUTE_ELEVE_AJOUT = (router: Router): string =>
  `/index/${aireCourante(router)}/students/add`;
export const ROUTE_ELEVE_EDITION = (router: Router): string =>
  `/index/${aireCourante(router)}/students/edit`;
export const ROUTE_INSCRIPTIONS = (router: Router): string =>
  `/index/${aireCourante(router)}/inscriptions`;
export const ROUTE_INSCRIPTION_AJOUT = (router: Router): string =>
  `/index/${aireCourante(router)}/inscriptions/add`;

/** Cle unique du state, pour eviter toute collision entre navigations. */
export const STATE_ELEVE_ID = 'eleveId';

/**
 * Roles qui saisissent une inscription.
 *
 * L'inscription ouvre les frais et l'echeancier : c'est un acte de caisse, que
 * le tresorier pose au guichet. Le surveillant la garde, recevant lui aussi
 * les familles ; le manager, lui, ne fait plus qu'en suivre la liste. La meme
 * regle est appliquee cote serveur par StoreInscriptionRequest — ceci ne fait
 * qu'eviter d'afficher un bouton qui repartirait en 403.
 */
const ROLES_SAISIE_INSCRIPTION = ['admin', 'treasurer', 'supervisor'];

/**
 * `inscriptions/add` n'existe que dans treasurer.route.ts et
 * supervisor.route.ts : manager.route.ts l'a volontairement supprimee (voir
 * son commentaire). Un admin navigue avec le meme role dans les trois
 * espaces ; se fier au seul role afficherait donc le bouton dans l'espace
 * manager et ferait echouer la navigation avec NG04002 (route introuvable).
 */
const AIRES_SAISIE_INSCRIPTION = ['treasurer', 'supervisor'];

export function peutSaisirInscription(role: string, router?: Router): boolean {
  if (!ROLES_SAISIE_INSCRIPTION.includes(role)) {
    return false;
  }

  return router ? AIRES_SAISIE_INSCRIPTION.includes(aireCourante(router)) : true;
}

interface EleveState {
  [STATE_ELEVE_ID]?: unknown;
}

/**
 * Lit l'identifiant depuis le state de navigation.
 *
 * `getCurrentNavigation()` n'est renseigne que pendant la navigation (donc
 * dans le constructeur) ; `history.state` lui survit et couvre ngOnInit, les
 * retours arriere ET les rafraichissements — le navigateur conserve
 * history.state au rechargement, la fiche reste donc affichable apres un F5.
 * On tente les deux sources.
 *
 * Retourne null uniquement si aucun state n'a jamais ete pose (URL saisie ou
 * collee directement) : l'appelant revient alors a la liste.
 */
export function lireEleveIdDepuisState(router: Router): number | null {
  const navigation = router.getCurrentNavigation()?.extras?.state as EleveState | undefined;
  const historique = (typeof history !== 'undefined' ? history.state : null) as EleveState | null;

  return versId(navigation?.[STATE_ELEVE_ID]) ?? versId(historique?.[STATE_ELEVE_ID]);
}

function versId(valeur: unknown): number | null {
  const id = Number(valeur);

  return Number.isInteger(id) && id > 0 ? id : null;
}
