/**
 * Paramétrage applicatif — une seule ligne en base.
 *
 * Présenté avec l'établissement sur un même écran, mais stocké à part : sa
 * modification est réservée à l'admin, là où l'établissement est ouvert au
 * manager.
 */
export interface Setting {
  id: number;

  /** Chiffré en base côté serveur. */
  telephone_transaction: string;

  statut: boolean;
  en_maintenance: boolean;
  code_couleur: string;

  /** Barème appliqué par défaut aux nouvelles évaluations (1 à 100). */
  bareme_defaut: number;
}

/**
 * Ce que le formulaire envoie : `id` n'est pas modifiable et le serveur
 * l'ignore, l'envoyer n'apportait rien.
 *
 * `statut` et `en_maintenance` sont facultatifs : seul l'admin les transmet.
 * Omis, ils gardent leur valeur — le serveur les valide en `sometimes` et les
 * écarte pour les autres rôles.
 */
export type SettingPayload = Omit<Setting, 'id' | 'statut' | 'en_maintenance'> &
  Partial<Pick<Setting, 'statut' | 'en_maintenance'>>;
