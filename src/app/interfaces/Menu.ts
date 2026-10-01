export interface Menu {
  id: number;
  code: string;
  title: string;
  type: string;
  classes: string;
  url: string;
  icon: string;
  breadcrumbs: boolean;
  position: number;
  is_default: boolean;
  /**
   * Groupe de la sidebar auquel ce menu appartient (ex. « Mon établissement »).
   * `null`/absent = lien direct hors groupe (ex. Tableau de bord).
   */
  groupe?: string | null;
  /** Icône du groupe (sans le préfixe « mat: »), si le backend en fournit une. */
  groupe_icon?: string | null;
}
