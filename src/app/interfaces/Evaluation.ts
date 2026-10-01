import { Affectation } from './ClasseMatiere';
import { Periode } from './Periode';

/**
 * Reflète App\Enums\TypeEvaluationEnum. Cadre imposé : par matière et par
 * période, on attend un Devoir 1, un Devoir 2 et une Composition.
 */
export type TypeEvaluation = 'DEVOIR_1' | 'DEVOIR_2' | 'COMPOSITION';

export const TYPES_EVALUATION: { value: TypeEvaluation; label: string }[] = [
  { value: 'DEVOIR_1', label: 'Devoir 1' },
  { value: 'DEVOIR_2', label: 'Devoir 2' },
  { value: 'COMPOSITION', label: 'Composition' }
];

/** Métadonnées de saisie renvoyées par /evaluations/meta. */
export interface EvaluationMeta {
  bareme_defaut: number;
  types: { value: TypeEvaluation; label: string }[];
}

export interface Evaluation {
  id: number;
  affectation_id: number;
  periode_id: number;
  titre: string;
  type: TypeEvaluation;
  bareme: number;
  date_evaluation: string;

  // Attributs calculés côté backend (lecture seule).
  coefficient?: number | null; // déduit de classe_matiere.coefficient
  type_libelle?: string;

  // Relations sérialisées par Eloquent.
  affectation?: Affectation;
  periode?: Periode;

  // Compteur ajouté par withCount('notes') côté liste.
  notes_count?: number;
}

/**
 * Payload de création. Le coefficient n'est pas envoyé (déduit côté backend)
 * et le barème est optionnel (par défaut celui de l'établissement).
 */
export interface EvaluationPayload {
  affectation_id: number;
  periode_id: number;
  titre: string;
  type: TypeEvaluation;
  bareme?: number;
  date_evaluation: string;
}

/** Payload de mise à jour : l'affectation n'est pas modifiable après coup. */
export type EvaluationUpdatePayload = Partial<Omit<EvaluationPayload, 'affectation_id'>>;

/** Une ligne de la grille de saisie : un élève et sa note éventuelle. */
export interface NoteLigne {
  eleve_id: number;
  matricule: string | null;
  nom_complet: string;
  valeur: number | null;
  absent: boolean;
  appreciation: string | null;
}

/** Réponse de /evaluations/grade-sheet/{id}. */
export interface GradeSheet {
  evaluation: Evaluation;
  saisie_fermee: boolean;
  lignes: NoteLigne[];
}

/** Une note envoyée lors de la saisie en lot. */
export interface NoteInput {
  eleve_id: number;
  valeur: number | null;
  absent: boolean;
  appreciation: string | null;
}
