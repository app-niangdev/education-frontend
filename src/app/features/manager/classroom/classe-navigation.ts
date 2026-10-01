import { Router } from '@angular/router';
import { Classe } from 'src/app/interfaces/Classe';
import { aireCourante } from 'src/app/core/navigation/aire-courante';

/**
 * La classe selectionnee transite par le state du Router plutot que par l'URL.
 * Ces routes n'exposent donc aucun parametre : l'objet classe (et donc son id)
 * est pose dans le state a la navigation.
 *
 * Les ecrans classes/emploi du temps sont partages entre l'espace manager et
 * l'espace surveillant : le segment d'aire (`manager` ou `supervisor`) est
 * resolu a l'execution depuis l'URL courante.
 */
export const ROUTE_CLASSES = (router: Router): string =>
  `/index/${aireCourante(router)}/classrooms`;
export const ROUTE_CLASSE_PROGRAMME = (router: Router): string =>
  `/index/${aireCourante(router)}/classrooms/programme`;
export const ROUTE_CLASSE_EMPLOI_DU_TEMPS = (router: Router): string =>
  `/index/${aireCourante(router)}/classrooms/emploi-du-temps`;

/** Cle unique du state, pour eviter toute collision entre navigations. */
export const STATE_CLASSE = 'classe';

interface ClasseState {
  [STATE_CLASSE]?: unknown;
}

/**
 * Lit la classe depuis le state de navigation.
 *
 * `getCurrentNavigation()` n'est renseigne que pendant la navigation (donc
 * dans le constructeur) ; `history.state` lui survit et couvre ngOnInit, les
 * retours arriere ET les rafraichissements (le navigateur conserve
 * history.state au rechargement). On tente les deux sources.
 *
 * Retourne null uniquement si aucun state n'a jamais ete pose (URL saisie ou
 * collee directement) : l'appelant revient alors a la liste.
 */
export function lireClasseDepuisState(router: Router): Classe | null {
  const navigation = router.getCurrentNavigation()?.extras?.state as
    | ClasseState
    | undefined;
  const historique = (
    typeof history !== 'undefined' ? history.state : null
  ) as ClasseState | null;

  return (
    versClasse(navigation?.[STATE_CLASSE]) ??
    versClasse(historique?.[STATE_CLASSE])
  );
}

function versClasse(valeur: unknown): Classe | null {
  if (valeur && typeof valeur === 'object' && 'id' in valeur) {
    return valeur as Classe;
  }
  return null;
}
