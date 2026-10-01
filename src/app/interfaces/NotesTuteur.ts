/**
 * Les résultats scolaires tels que la famille les consulte.
 *
 * Les moyennes viennent du serveur, jamais recalculées ici : elles sont
 * produites par le même moteur que les bulletins, et un second calcul côté
 * navigateur finirait par afficher une valeur différente de celle du bulletin
 * papier.
 */

/** Un enfant rattaché au compte, pour le sélecteur de l'écran. */
export interface EleveDuTuteur {
  id: number;
  nom_complet: string;
  matricule: string | null;
  photo: string | null;
  classe: string | null;
  classe_id: number | null;
}

/** Une période de l'année scolaire. */
export interface PeriodeReleve {
  id: number;
  libelle: string;
  ordre: number;
}

/** Une évaluation et la note qu'y a obtenue l'enfant. */
export interface EvaluationReleve {
  id: number;
  titre: string;
  type: string;
  date: string | null;
  bareme: number;
  /** Nulle si l'élève était absent, ou si la note n'est pas encore saisie. */
  valeur: number | null;
  absent: boolean;
  /** Distingue « pas encore noté » de « absent ». */
  saisie: boolean;
}

/** Une matière du programme, avec ses moyennes et son détail. */
export interface MatiereReleve {
  matiere_id: number | null;
  matiere: string;
  code: string | null;
  coefficient: number;
  moy_devoirs: number | null;
  composition: number | null;
  moyenne: number | null;
  appreciation: string | null;
  /** Faux quand aucune note n'existe : la matière s'affiche en tirets. */
  notee: boolean;
  evaluations: EvaluationReleve[];
}

/** Moyenne générale et totaux, calculés comme sur le bulletin. */
export interface SyntheseReleve {
  moyenne_generale: number;
  total_points: number | null;
  total_coefficients: number;
  mention: string | null;
}

/** Le relevé complet d'un enfant pour une période. */
export interface ReleveNotes {
  eleve: {
    id: number;
    nom_complet: string;
    matricule: string | null;
    photo: string | null;
    classe: string | null;
  };
  periodes: PeriodeReleve[];
  /** Nulle si l'année scolaire n'a pas encore de période définie. */
  periode: PeriodeReleve | null;
  matieres: MatiereReleve[];
  /** Nulle tant qu'aucune matière n'est notée. */
  synthese: SyntheseReleve | null;
}
