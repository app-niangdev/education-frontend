import { AnneeScolaire } from './AnneeScolaire';
import { FraisScolaire } from './FraisScolaire';

/**
 * Un niveau ne porte aucun montant en base : les tarifs dépendent de l'année
 * scolaire et vivent dans la grille des frais scolaires. L'interface les
 * présente néanmoins ensemble — ils se saisissent d'un seul geste.
 */
export interface Niveau {
  id: number;
  nom: string;
  code: string;
  cycle: string;

  /** Rang du niveau dans son cycle (progression scolaire). */
  ordre?: number;

  /** Libellé lisible du cycle (« Collège »), ajouté par le backend. */
  cycle_libelle?: string;

  /**
   * Barème de l'année en cours, chargé par `/niveaux/grille`. Absent quand le
   * niveau n'a pas encore de tarif sur cette année.
   */
  frais_scolaire?: FraisScolaire | null;
}

/**
 * Ce que saisit le formulaire unifié : le niveau et son tarif d'un seul geste.
 *
 * Les montants sont facultatifs — sans année scolaire en cours il n'y a rien à
 * tarifer, le niveau se crée alors seul. `frais_annuel` n'est jamais envoyé :
 * le serveur le calcule.
 */
export interface NiveauPayload {
  nom: string;
  code: string;
  cycle: string;

  montant_inscription?: number | null;
  montant_mensualite?: number | null;
  nombre_mensualites?: number | null;
  neuvieme_mois_inclus?: boolean;
}

/**
 * Réponse de `/niveaux/grille` : les niveaux dans l'ordre de progression, avec
 * le barème de l'année en cours. `annee` est nulle si aucune n'est en cours —
 * les niveaux s'affichent alors sans tarif.
 */
export interface NiveauGrille {
  annee: AnneeScolaire | null;
  niveaux: Niveau[];
}
