/**
 * Tableau de bord manager renvoyé par GET /statistiques/dashboard.
 * Reflète App\Services\StatistiqueService.
 */
export interface DashboardStats {
  annee_scolaire: { id: number; nom: string } | null;

  effectifs: {
    eleves_inscrits: number;
    classes: number;
    niveaux: number;
    enseignants: number;
    surveillants: number;
    tresoriers: number;
    tuteurs: number;
  };

  eleves_par_sexe: {
    masculin: number;
    feminin: number;
  };

  eleves_par_niveau: {
    niveau: string;
    code: string;
    total: number;
  }[];

  inscriptions_par_statut: {
    en_attente: number;
    validee: number;
    annulee: number;
    total: number;
  };

  finances: {
    inscriptions: MontantTriplet;
    mensualites: MontantTriplet;
    total: MontantTriplet;
    taux_recouvrement: number;
  };
}

export interface MontantTriplet {
  du: number;
  encaisse: number;
  reste: number;
}

/** Tableau de bord financier du trésorier. */
export interface DashboardTresorier {
  annee_scolaire: { id: number; nom: string } | null;

  finances: {
    inscriptions: MontantTriplet;
    mensualites: MontantTriplet;
    total: MontantTriplet;
    taux_recouvrement: number;
  };

  encaissements: {
    aujourdhui: EncaissementPeriode;
    ce_mois: EncaissementPeriode;
    annee: EncaissementPeriode;
  };

  par_mode_paiement: { mode: string; montant: number }[];

  mensualites_par_statut: {
    paye: number;
    partiel: number;
    non_paye: number;
    total: number;
  };

  a_encaisser: {
    inscriptions: number;
    mensualites: number;
  };
}

export interface EncaissementPeriode {
  montant: number;
  nombre: number;
}

/** Tableau de bord de l'enseignant. */
export interface DashboardEnseignant {
  annee_scolaire: { id: number; nom: string } | null;

  effectifs: {
    affectations: number;
    classes: number;
    matieres: number;
    eleves: number;
  };

  // Clés dynamiques par type d'évaluation + total.
  evaluations_par_type: {
    total: number;
    [type: string]: number;
  };

  saisie_notes: {
    notes_saisies: number;
    notes_attendues: number;
    taux: number;
    evaluations_completes: number;
    evaluations_total: number;
  };

  mes_cours: {
    classe: string;
    matiere: string;
    evaluations: number;
    eleves: number;
  }[];
}
