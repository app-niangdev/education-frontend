import { AnneeScolaire } from './AnneeScolaire';
import { Niveau } from './Niveau';

export interface Classe {
  id: number;
  nom: string;
  code: string | null;
  effectif_max: number | null;
  niveau_id: number;
  annee_scolaire_id: number;

  // Relations chargees par le backend. Eloquent les serialise en snake_case :
  // la relation anneeScolaire() sort sous la cle `annee_scolaire`.
  niveau?: Niveau;
  annee_scolaire?: AnneeScolaire;

  // Ajoute par withCount('inscriptions') sur /classes/list.
  inscriptions_count?: number;
}

/**
 * annee_scolaire_id n'est pas saisi par l'utilisateur : le front reprend
 * l'annee scolaire en cours, seule visible dans la liste.
 */
export type ClassePayload = Omit<
  Classe,
  'id' | 'niveau' | 'annee_scolaire' | 'inscriptions_count'
>;
