import { Classe } from './Classe';
import { Enseignant } from './Enseignant';
import { Matiere } from './Matiere';

/**
 * L'affectation d'un enseignant a un couple (classe x matiere).
 * Cote backend, la relation classeMatiere->affectation() est un hasOne.
 */
export interface Affectation {
  id: number;
  enseignant_id: number;
  classe_matiere_id: number;
  enseignant?: Enseignant;
  // Relation classeMatiere() serialisee en snake_case par Eloquent.
  classe_matiere?: ClasseMatiere;
}

/**
 * Une matiere inscrite au programme d'une classe : son coefficient et son
 * volume horaire sont propres a cette classe (ex. Math coeff 6 en TS2,
 * coeff 2 en TL2). L'enseignant affecte est expose via `affectation`.
 */
export interface ClasseMatiere {
  id: number;
  classe_id: number;
  matiere_id: number;
  coefficient: number;
  volume_horaire: number | null;

  /** Ordre d'affichage sur le bulletin, propre a la classe. */
  ordre?: number;

  matiere?: Matiere;
  classe?: Classe;
  affectation?: Affectation | null;
}

export interface ClasseMatierePayload {
  classe_id: number;
  matiere_id: number;
  coefficient: number;
  volume_horaire?: number | null;
}

export interface ClasseMatiereUpdatePayload {
  coefficient: number;
  volume_horaire?: number | null;
}

export interface AffectationPayload {
  enseignant_id: number;
  classe_matiere_id: number;
}
