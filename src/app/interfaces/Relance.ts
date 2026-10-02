/** Ce qu'un élève doit encore : reste d'inscription et mois échus non soldés. */
export interface ArriereEleve {
  nom_complet: string;
  matricule: string;
  classe: string | null;
  reste_inscription: number;
  mois: { libelle: string; reste: number }[];
  total: number;
}

/**
 * Une famille en retard de paiement. La relance s'adresse au tuteur : une
 * fratrie donne une seule ligne, qui détaille chaque enfant.
 */
export interface Debiteur {
  tuteur: { id: number; nom_complet: string; telephone: string };
  eleves: ArriereEleve[];
  total: number;
  derniere_relance_at: string | null;

  /** Ce qui empêche la relance (numéro invalide, relance récente…), ou null. */
  blocage: 'inactif' | 'sans_arriere' | 'sans_telephone' | 'recent' | null;
  blocage_message: string | null;
}

export interface DebiteursPayload {
  debiteurs: Debiteur[];
  /** Faux tant que WhatsApp n'est pas configuré pour l'établissement. */
  active: boolean;
  /** Délai minimal entre deux relances d'une même famille. */
  delai_heures: number;
}

export interface RelanceResultat {
  statut: 'envoyee';
  message: string;
  derniere_relance_at: string | null;
}

/**
 * Une tentative d'envoi : relance d'un arriéré par le trésorier, ou rappel
 * automatique d'une échéance à venir (sans auteur).
 */
export interface RelanceHistorique {
  id: number;
  type: 'RELANCE' | 'RAPPEL';
  statut: 'ENVOYEE' | 'ECHEC';
  montant: number;
  telephone: string;
  erreur: string | null;
  created_at: string;
  tuteur: { id: number; nom_complet: string } | null;
  utilisateur: { id: number; full_name: string } | null;
}

/** État de la liaison WhatsApp de l'établissement. */
export interface StatutWhatsapp {
  etat: 'connecte' | 'deconnecte' | 'injoignable' | 'non_configure';
  message: string;
  numero: string | null;
}
