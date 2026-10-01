import { Affectation } from './ClasseMatiere';

export type JourSemaine =
  | 'LUNDI'
  | 'MARDI'
  | 'MERCREDI'
  | 'JEUDI'
  | 'VENDREDI'
  | 'SAMEDI';

export const JOURS_SEMAINE: { value: JourSemaine; libelle: string }[] = [
  { value: 'LUNDI', libelle: 'Lundi' },
  { value: 'MARDI', libelle: 'Mardi' },
  { value: 'MERCREDI', libelle: 'Mercredi' },
  { value: 'JEUDI', libelle: 'Jeudi' },
  { value: 'VENDREDI', libelle: 'Vendredi' },
  { value: 'SAMEDI', libelle: 'Samedi' }
];

/**
 * Un creneau de cours. `affectation` (chargee par le backend) porte la matiere
 * et l'enseignant via affectation.classe_matiere.
 */
export interface EmploiDuTemps {
  id: number;
  classe_id: number;
  affectation_id: number;
  jour: JourSemaine;
  // Le backend serialise les colonnes `time` en 'HH:MM:SS'.
  heure_debut: string;
  heure_fin: string;
  salle: string | null;
  affectation?: Affectation;
}

export interface EmploiDuTempsPayload {
  classe_id: number;
  affectation_id: number;
  jour: JourSemaine;
  heure_debut: string;
  heure_fin: string;
  salle?: string | null;
}

export interface EmploiDuTempsUpdatePayload {
  affectation_id: number;
  jour: JourSemaine;
  heure_debut: string;
  heure_fin: string;
  salle?: string | null;
}
