import { Contrat, ModeRemuneration, TypeContrat } from './Contrat';
import { User } from './User';

export interface Tresorier {
  id: number;
  user_id: number;
  user?: User;
  matricule: string | null;
  numero_compte_bancaire: string | null;
  banque: string | null;
  acces_caisse: boolean;

  /** Le contrat qui l'engage actuellement, s'il en a un. */
  contrat_actif?: Contrat | null;

  /**
   * Conditions d'engagement servies par le contrat en cours. En lecture seule :
   * les modifier passe par le module Contrats, qui les historise.
   */
  type_contrat: TypeContrat | null;
  date_embauche: string | null;
  salaire_base: number | null;
  mode_remuneration: ModeRemuneration | null;
  remuneration_libelle: string | null;

  deleted_at?: string | null;
}
