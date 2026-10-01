/**
 * Bilan financier renvoyé par GET /bilan.
 * Reflète App\Services\BilanService.
 */

/** Le périmètre sur lequel portent les chiffres affichés. */
export interface BilanPeriode {
  type: 'annee' | 'mois';
  mois: number | null;
  annee: number | null;
  libelle: string;
}

/**
 * Un mois proposé par le filtre. `hors_calendrier` marque les mois situés
 * avant ou après l'année scolaire, qui portent tout de même des mouvements
 * (des inscriptions encaissées avant la rentrée, typiquement).
 */
export interface BilanMois {
  mois: number;
  annee: number;
  libelle: string;
  hors_calendrier: boolean;
}

/**
 * Le résultat de trésorerie du périmètre : ce qui est entré moins ce qui est
 * sorti. `marge` est la part du résultat dans les encaissements.
 */
export interface BilanResultat {
  encaisse: number;
  depense: number;
  benefice: number;
  excedent: boolean;
  marge: number;
  taux_charge: number;
}

export interface MontantNombre {
  montant: number;
  nombre: number;
}

export interface BilanEncaissements {
  total: number;
  nombre: number;
  par_source: {
    inscriptions: MontantNombre;
    mensualites: MontantNombre;
  };
  par_mode_paiement: {
    mode: string;
    libelle: string;
    montant: number;
  }[];
}

export interface BilanDepenses {
  total: number;
  nombre: number;
  /** Le poste SALAIRES isolé, confronté à la masse salariale contractuelle. */
  salaires: number;
  par_categorie: {
    categorie: string;
    libelle: string;
    montant: number;
    nombre: number;
  }[];
}

/**
 * Confrontation entre les salaires réellement décaissés et l'engagement
 * mensuel porté par les contrats actifs. Les contrats horaires n'entrent pas
 * dans l'engagement : leur montant dépend d'heures que l'application ne
 * comptabilise pas.
 */
export interface BilanMasseSalariale {
  decaisse: number;
  engagement_mensuel: number;
  ecart: number;
  contrats_actifs: number;
  contrats_mensuels: number;
  contrats_horaires: number;
  part_des_depenses: number;
}

export interface MontantTripletBilan {
  du: number;
  encaisse: number;
  reste: number;
}

/**
 * Ce que les élèves doivent encore. Toujours cumulé sur l'année, jamais borné
 * au mois : un impayé d'octobre reste dû en janvier.
 */
export interface BilanCreances {
  inscriptions: MontantTripletBilan;
  mensualites: MontantTripletBilan;
  total: MontantTripletBilan;
  taux_recouvrement: number;
  eleves_debiteurs: {
    inscriptions: number;
    mensualites: number;
    /** Élèves distincts : un même élève peut être débiteur des deux côtés. */
    total: number;
  };
}

/** Une ligne de la courbe annuelle. `court` sert aux axes de graphique. */
export interface BilanEvolutionMois {
  mois: number;
  annee: number;
  libelle: string;
  court: string;
  hors_calendrier: boolean;
  encaisse: number;
  depense: number;
  solde: number;
}

export interface Bilan {
  annee_scolaire: { id: number; nom: string } | null;
  periode: BilanPeriode;
  mois_disponibles: BilanMois[];
  resultat: BilanResultat;
  encaissements: BilanEncaissements;
  depenses: BilanDepenses;
  masse_salariale: BilanMasseSalariale;
  creances: BilanCreances;
  /** Toujours calculée sur l'année entière, même quand un mois est filtré. */
  evolution_mensuelle: BilanEvolutionMois[];
}

/** Les critères acceptés par l'endpoint. `mois` exige toujours `annee`. */
export interface BilanFiltres {
  annee_scolaire_id?: number;
  mois?: number;
  annee?: number;
}
