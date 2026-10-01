import { Inscription, StatutPaiement } from './Inscription';
import { ModePaiement } from './Paiement';
import { User } from './User';

/**
 * Mensualité d'une inscription. Le montant est dû par mois ; le règlement peut
 * se faire en plusieurs tranches (chaque versement partiel fait passer la
 * mensualité à PARTIEL, puis PAYE une fois soldée). total_paye / reste sont
 * calculés côté serveur à partir des paiements réels.
 */
export interface Mensualite {
  id: number;
  inscription_id: number;
  mois: number;
  annee: number;
  montant_mensualite: number;
  statut: StatutPaiement;

  // Accesseurs calculés (appends backend).
  total_paye?: number;
  reste?: number;

  // Relations chargées par le backend.
  inscription?: Inscription;
  paiements?: PaiementMensualite[];

  /**
   * Versement créé par le dernier encaissement, renvoyé uniquement par la
   * réponse de paiement : permet d'imprimer le justificatif dans la foulée.
   */
  paiement_cree?: PaiementMensualite;
}

export interface PaiementMensualite {
  id: number;
  mensualite_id: number;
  /** Facture qui regroupe ce versement ; null pour un encaissement isolé. */
  facture_mensualite_id?: number | null;
  utilisateur_id: number | null;
  numero_recu: string;
  montant: number;
  mode_paiement: ModePaiement;
  numero_transaction: string | null;
  date_paiement: string;

  // Relations chargées par le backend.
  mensualite?: Mensualite;
  utilisateur?: User;
}

/**
 * Facture regroupant plusieurs mois réglés en une seule fois : un numéro
 * (FAM-xxx-yy), un seul justificatif PDF, mais une ligne comptable par mois
 * (les PaiementMensualite rattachés).
 */
export interface FactureMensualite {
  id: number;
  inscription_id: number;
  utilisateur_id: number | null;
  numero_facture: string;
  montant_total: number;
  mode_paiement: ModePaiement;
  numero_transaction: string | null;
  date_paiement: string;

  // Accesseur calculé (append backend).
  nombre_mois?: number;

  // Relations chargées par le backend.
  inscription?: Inscription;
  lignes?: PaiementMensualite[];
  utilisateur?: User;
}

/**
 * Une ligne de facture en mode sélection : le mois coché et le montant qu'on
 * lui impute (par défaut son reste à payer).
 */
export interface LigneFacturePayload {
  mensualite_id: number;
  montant: number;
}

/**
 * Encaissement multi-mois. Deux modes :
 *
 *  - AUTOMATIQUE : seul `montant` compte ; le serveur l'impute en cascade sur
 *    les mois non soldés du plus ancien au plus récent (50 000 avec une
 *    mensualité de 20 000 solde deux mois et avance 10 000 sur le troisième) ;
 *  - SELECTION : `lignes` porte les mois cochés et leurs montants.
 */
export interface PayerFacturePayload {
  mode_repartition: 'AUTOMATIQUE' | 'SELECTION';
  montant?: number | null;
  lignes?: LigneFacturePayload[];
  mode_paiement: ModePaiement;
  numero_transaction?: string | null;
  date_paiement?: string | null;
}

/**
 * Versement sur une mensualité. Le montant fait foi côté serveur : au moins 1,
 * au plus le reste à payer. numero_recu est généré par le backend (REM-xxx-yy).
 */
export interface PayerMensualitePayload {
  montant: number;
  mode_paiement: ModePaiement;
  numero_transaction?: string | null;
  date_paiement?: string | null;
}

/** Libellé français d'un mois (1-12). */
export const MOIS_FR: Record<number, string> = {
  1: 'Janvier',
  2: 'Février',
  3: 'Mars',
  4: 'Avril',
  5: 'Mai',
  6: 'Juin',
  7: 'Juillet',
  8: 'Août',
  9: 'Septembre',
  10: 'Octobre',
  11: 'Novembre',
  12: 'Décembre'
};
