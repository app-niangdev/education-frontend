import { User } from './User';

export type TypeContrat = 'permanent' | 'vacataire' | 'stagiaire';

export type StatutContrat =
  | 'BROUILLON'
  | 'ACTIF'
  | 'EXPIRE'
  | 'RESILIE'
  | 'SUSPENDU';

export type ModeRemuneration = 'MENSUEL' | 'HORAIRE';

/** Les trois profils du personnel pouvant être engagés. */
export type TypePersonnel = 'enseignant' | 'tresorier' | 'surveillant';

/**
 * Le contrat de travail d'un membre du personnel.
 *
 * Il porte les conditions d'engagement (dates, rémunération, fonction), que les
 * fiches du personnel se contentent désormais de refléter. Un employé peut en
 * avoir plusieurs dans le temps : un seul est en cours.
 */
export interface Contrat {
  id: number;

  /** Le profil engagé, côté serveur : « App\Models\Enseignant »… */
  contractable_type: string;
  contractable_id: number;
  contractable?: { id: number; matricule: string | null; user?: User };

  numero_contrat: string;
  /** Le code porté par le QR du contrat imprimé, qui ouvre sa page publique. */
  code_verification: string | null;
  type_contrat: TypeContrat;
  statut: StatutContrat;

  date_debut: string;
  /** Vide pour un permanent, engagé sans terme. */
  date_fin: string | null;
  /** En mois. */
  duree_periode_essai: number | null;

  salaire_base: number | null;
  mode_remuneration: ModeRemuneration;

  fonction: string | null;
  lieu_travail: string | null;
  volume_horaire_hebdo: number | null;

  date_resiliation: string | null;
  motif_resiliation: string | null;

  /** Le contrat que celui-ci renouvelle, le cas échéant. */
  contrat_parent_id: number | null;
  parent?: Contrat | null;
  renouvellements?: Contrat[];

  observations: string | null;

  // ── Calculés par le serveur ──
  /** Montant et unité déjà formatés (« 5 000 FCFA/h »). */
  remuneration_libelle: string | null;
  type_contrat_libelle: string | null;
  statut_libelle: string | null;
  en_periode_essai: boolean;
  /** Négatif si le terme est dépassé ; null si le contrat n'a pas de fin. */
  jours_avant_echeance: number | null;

  deleted_at?: string | null;
}

/**
 * Le bloc envoyé à la création d'un membre du personnel. Tout est facultatif :
 * le serveur complète la date de début et la fonction s'ils manquent.
 */
export interface ContratPayload {
  type_contrat?: TypeContrat;
  date_debut?: string | null;
  date_fin?: string | null;
  duree_periode_essai?: number | null;
  salaire_base?: number | null;
  mode_remuneration?: ModeRemuneration;
  fonction?: string | null;
  lieu_travail?: string | null;
  volume_horaire_hebdo?: number | null;
  observations?: string | null;
}

/**
 * Le résumé public d'un contrat, servi par `/verification-contrat/{code}`.
 *
 * C'est ce que voit quiconque scanne le QR code d'un contrat imprimé, sans être
 * authentifié : de quoi attester le document, et rien de plus — la rémunération
 * et les motifs de résiliation en sont volontairement absents.
 */
export interface VerificationContrat {
  numero_contrat: string;
  employe: string | null;
  matricule: string | null;
  fonction: string | null;
  type_contrat: string | null;
  statut: StatutContrat;
  statut_libelle: string | null;
  date_debut: string | null;
  date_fin: string | null;
  lieu_travail: string | null;
  /** Le contrat lie-t-il encore l'employé à l'établissement, à cet instant ? */
  est_en_vigueur: boolean;
  etablissement: string | null;
  /** Horodatage de la vérification, à afficher pour situer la réponse. */
  verifie_le: string;
}

/** Référentiels servis par `/contrats/meta`, pour les listes déroulantes. */
export interface ContratMeta {
  types_contrat: {
    value: TypeContrat;
    label: string;
    /** Un contrat borné exige une date de fin : le formulaire la rend requise. */
    exige_date_fin: boolean;
  }[];
  statuts: { value: StatutContrat; label: string }[];
}
