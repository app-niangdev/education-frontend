import { Router } from '@angular/router';

/**
 * Espaces applicatifs qui partagent les memes ecrans (classes, eleves,
 * inscriptions, emploi du temps...). L'URL a la forme /index/<aire>/...
 *
 * Le tresorier en fait partie depuis qu'il saisit les inscriptions : il
 * reutilise les ecrans eleves et inscriptions du manager, et sa navigation
 * doit rester dans /index/treasurer/...
 */
export type Aire = 'manager' | 'supervisor' | 'treasurer';

const AIRES: readonly Aire[] = ['manager', 'supervisor', 'treasurer'];
const AIRE_PAR_DEFAUT: Aire = 'manager';

/**
 * Deduit l'aire courante (`manager` ou `supervisor`) a partir de l'URL du
 * Router. Permet aux ecrans mutualises de naviguer en restant dans l'espace de
 * l'utilisateur connecte, sans dupliquer les composants par role.
 *
 * Retombe sur `manager` si l'URL ne correspond a aucune aire connue.
 */
export function aireCourante(router: Router): Aire {
  const segments = router.url.split('/').filter(Boolean);
  const apresIndex = segments[0] === 'index' ? segments[1] : segments[0];

  return AIRES.find((aire) => aire === apresIndex) ?? AIRE_PAR_DEFAUT;
}
