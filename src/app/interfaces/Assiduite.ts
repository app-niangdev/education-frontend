import { Classe } from './Classe';
import { Affectation } from './ClasseMatiere';
import { Eleve } from './Eleve';
import { EmploiDuTemps } from './EmploiDuTemps';
import { Periode } from './Periode';

/**
 * Reflète App\Enums\StatutPresenceEnum.
 *
 * Seules les anomalies sont enregistrées : un élève présent ne produit aucune
 * ligne, d'où le `null` dans les grilles de saisie.
 */
export type StatutPresence = 'ABSENT' | 'RETARD' | 'RENVOYE';

/** Reflète App\Enums\StatutSeanceEnum. */
export type StatutSeance = 'PLANIFIEE' | 'FAITE' | 'NON_ASSUREE';

export const STATUTS_PRESENCE: { value: StatutPresence; label: string }[] = [
  { value: 'ABSENT', label: 'Absent' },
  { value: 'RETARD', label: 'Retard' },
  { value: 'RENVOYE', label: 'Renvoyé de cours' }
];

export const STATUTS_SEANCE: { value: StatutSeance; label: string }[] = [
  { value: 'PLANIFIEE', label: 'Appel non fait' },
  { value: 'FAITE', label: 'Appel fait' },
  { value: 'NON_ASSUREE', label: 'Cours non assuré' }
];

/** Un créneau tenu à une date précise. */
export interface SeanceAppel {
  id: number;
  emploi_du_temps_id: number | null;
  classe_id: number;
  affectation_id: number | null;
  annee_scolaire_id: number;
  periode_id: number | null;

  date_seance: string;
  // Figés à la création : la séance telle qu'elle a eu lieu, pas le créneau
  // tel qu'il est aujourd'hui.
  heure_debut: string;
  heure_fin: string;
  duree_minutes: number;

  statut: StatutSeance;
  saisie_par: number | null;
  saisie_le: string | null;
  commentaire: string | null;

  // Attributs calculés côté backend.
  statut_libelle?: string;
  matiere_nom?: string | null;
  enseignant_nom?: string | null;

  classe?: Classe;
  affectation?: Affectation;
  periode?: Periode;
  presences?: Presence[];
}

/** Une anomalie relevée pour un élève. */
export interface Presence {
  id: number;
  seance_appel_id: number;
  eleve_id: number;
  statut: StatutPresence;
  minutes_retard: number | null;
  justifie: boolean;
  motif: string | null;
  justifie_par: number | null;
  justifie_le: string | null;

  statut_libelle?: string;
  /** URL du justificatif scanné, null s'il n'y en a pas. */
  justificatif_url?: string | null;

  eleve?: Eleve;
  seance?: SeanceAppel;
}

/** Un créneau de la journée, avec la séance déjà saisie s'il y en a une. */
export interface CreneauDuJour extends EmploiDuTemps {
  classe?: Classe;
  seance?: SeanceAppel | null;
}

/** Réponse de /assiduite/mes-creneaux. */
export interface JourneeAppel {
  date: string;
  jour: string | null;
  est_dimanche: boolean;
  creneaux: CreneauDuJour[];
  periode_id: number | null;
  /** Vrai si la date ne tombe dans aucune période : l'appel ne comptera pas au bulletin. */
  hors_periode: boolean;
}

/** Une ligne de la feuille d'appel : un élève et son éventuelle anomalie. */
export interface LigneAppel {
  eleve_id: number;
  matricule: string | null;
  nom_complet: string;
  /** null = présent. */
  statut: StatutPresence | null;
  minutes_retard: number | null;
  motif: string | null;
  justifie: boolean;
}

/** Réponse de /assiduite/feuille-appel. */
export interface FeuilleAppel {
  creneau: CreneauDuJour;
  date: string;
  seance: SeanceAppel | null;
  lignes: LigneAppel[];
  hors_periode: boolean;
  /** Faux quand l'enseignant a dépassé son délai de saisie. */
  modifiable: boolean;
}

/** Une anomalie envoyée lors de l'enregistrement de l'appel. */
export interface LigneAppelInput {
  eleve_id: number;
  statut: StatutPresence;
  minutes_retard?: number | null;
  motif?: string | null;
}

export interface EnregistrerAppelPayload {
  emploi_du_temps_id: number;
  date_seance: string;
  statut_seance?: StatutSeance;
  commentaire?: string | null;
  lignes: LigneAppelInput[];
}

export interface JustifierPayload {
  justifie: boolean;
  motif?: string | null;
}

export interface CorrigerPresencePayload {
  statut?: StatutPresence;
  minutes_retard?: number | null;
  motif?: string | null;
}

/** Réponse de /assiduite/fiche-eleve/{id}. */
export interface FicheAssiduiteEleve {
  eleve: Eleve;
  periode_id: number | null;
  totaux: {
    heures_absence: number;
    heures_absence_non_justifiee: number;
    retards: number;
    renvois: number;
    anomalies: number;
  };
  presences: Presence[];
}

/** Référentiels renvoyés par /assiduite/meta. */
export interface AssiduiteMeta {
  statuts_presence: { value: StatutPresence; label: string }[];
  statuts_seance: { value: StatutSeance; label: string }[];
  /** Au-delà de ce délai, l'enseignant doit passer par le surveillant. */
  jours_saisie_enseignant: number;
}

/** Réponse de /assiduite/dashboard-surveillant. */
export interface DashboardAssiduite {
  date: string;
  compteurs: {
    absents: number;
    retards: number;
    renvois: number;
  };
  appels: {
    faites: number;
    attendues: number;
    non_assurees: number;
    taux: number;
  };
  appels_manquants: CreneauDuJour[];
  recidivistes: {
    eleve_id: number;
    nom: string;
    prenom: string;
    matricule: string | null;
    minutes_non_justifiees: number;
    retards: number;
    derniere_absence: string;
  }[];
  a_justifier: number;
  par_classe: {
    classe_id: number;
    classe_nom: string;
    heures: number;
    effectif: number;
    heures_par_eleve: number;
  }[];
  tendance: {
    date: string;
    libelle: string;
    total: number;
  }[];
}
