import { Contrat, ModeRemuneration, TypeContrat } from './Contrat';
import { Matiere } from './Matiere';
import { User } from './User';

export interface Enseignant {
  id: number;
  user_id: number;
  user?: User;
  matricule: string | null;
  /**
   * Matières de spécialité : ce que l'enseignant est qualifié à enseigner.
   * À distinguer des affectations, qui le rattachent à une classe précise.
   */
  matieres?: Matiere[];
  diplomes: string | null;

  /** Le contrat qui l'engage actuellement, s'il en a un. */
  contrat_actif?: Contrat | null;

  /**
   * Conditions d'engagement servies par le contrat en cours. En lecture seule :
   * les modifier passe par le module Contrats, qui les historise.
   * `null` quand l'enseignant n'a aucun contrat ouvert.
   */
  type_contrat: TypeContrat | null;
  date_embauche: string | null;
  salaire_base: number | null;
  mode_remuneration: ModeRemuneration | null;
  /** Montant et unité déjà formatés par le backend (« 5 000 FCFA/h »). */
  remuneration_libelle: string | null;

  deleted_at?: string | null;
}

export type { ModeRemuneration };
