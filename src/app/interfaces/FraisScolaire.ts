import { AnneeScolaire } from './AnneeScolaire';
import { Niveau } from './Niveau';

/**
 * Barème tarifaire d'une combinaison (année scolaire + niveau).
 *
 * frais_annuel est recalculé côté serveur à chaque sauvegarde :
 * montant_inscription + montant_mensualite × nombre_mensualites.
 */
export interface FraisScolaire {
  id: number;
  annee_scolaire_id: number;
  niveau_id: number;
  montant_inscription: number;
  montant_mensualite: number;
  nombre_mensualites: number;
  frais_annuel: number;
  neuvieme_mois_inclus: boolean;

  // Relations chargées par le backend.
  annee_scolaire?: AnneeScolaire;
  niveau?: Niveau;
}

/**
 * frais_annuel n'est jamais saisi : le serveur le calcule. neuvieme_mois_inclus
 * est purement informatif (mention sur la fiche de renseignement).
 */
export interface FraisScolairePayload {
  annee_scolaire_id: number;
  niveau_id: number;
  montant_inscription: number;
  montant_mensualite: number;
  nombre_mensualites: number;
  neuvieme_mois_inclus?: boolean;
}

/** En modification, tous les champs sont optionnels. */
export type FraisScolaireUpdatePayload = Partial<FraisScolairePayload>;

/**
 * Ce que le formulaire a le droit de proposer, calculé par le serveur.
 *
 * `annee` est nulle lorsqu'aucune année scolaire n'est en cours : aucun barème
 * ne peut alors se créer. `niveaux` ne contient que ceux encore sans barème sur
 * cette année — en modification, le niveau du barème édité y figure aussi.
 */
export interface FraisScolaireReferentiels {
  annee: AnneeScolaire | null;
  niveaux: Niveau[];
}
