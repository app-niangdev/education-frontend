import { AnneeScolaire } from './AnneeScolaire';
import { Classe } from './Classe';
import { Eleve } from './Eleve';

/**
 * Reflete App\Enums\TypeInscriptionEnum. Le type n'est jamais choisi par
 * l'utilisateur : le backend le deduit de l'existence d'une inscription sur
 * une annee scolaire anterieure.
 */
export type TypeInscription = 'NOUVELLE' | 'REINSCRIPTION';

export const TYPES_INSCRIPTION: { value: TypeInscription; label: string }[] = [
  { value: 'NOUVELLE', label: 'Nouvelle' },
  { value: 'REINSCRIPTION', label: 'Réinscription' }
];

/** Reflete App\Enums\StatutInscriptionEnum (cycle de vie administratif). */
export type StatutInscription = 'EN_ATTENTE' | 'VALIDEE' | 'ANNULEE';

export const STATUTS: { value: StatutInscription; label: string }[] = [
  { value: 'EN_ATTENTE', label: 'En attente' },
  { value: 'VALIDEE', label: 'Validée' },
  { value: 'ANNULEE', label: 'Annulée' }
];

/** Reflete App\Enums\StatutPaiementEnum. */
export type StatutPaiement = 'NON_PAYE' | 'PARTIEL' | 'PAYE';

export const STATUTS_PAIEMENT: { value: StatutPaiement; label: string }[] = [
  { value: 'NON_PAYE', label: 'Non payé' },
  { value: 'PARTIEL', label: 'Partiel' },
  { value: 'PAYE', label: 'Payé' }
];

export interface Inscription {
  id: number;
  numero_inscription: string;
  eleve_id: number;
  classe_id: number;
  annee_scolaire_id: number;
  utilisateur_id: number | null;

  type_inscription: TypeInscription;
  statut_inscription: StatutInscription;
  statut_paiement: StatutPaiement;

  montant_inscription: number;
  date_inscription: string;

  // Relations chargees par le backend.
  eleve?: Eleve;
  classe?: Classe;
  annee_scolaire?: AnneeScolaire;
  paiements?: unknown[];
  mensualites?: import('./Mensualite').Mensualite[];

  // Accesseurs calcules a partir des paiements reels.
  montant_inscription_paye?: number;
  montant_inscription_restant?: number;

  /**
   * Versement cree par le dernier encaissement, renvoye uniquement par la
   * reponse de validation : permet d'imprimer le justificatif dans la foulee.
   */
  paiement_cree?: import('./Paiement').PaiementInscription;

  /**
   * Versements crees par un paiement reparti (un recu par mois touche),
   * renvoyes uniquement par la reponse d'encaissement reparti.
   */
  paiements_crees?: import('./Mensualite').PaiementMensualite[];
}

/**
 * Seuls l'eleve et la classe sont saisis. L'annee scolaire est portee par la
 * classe, le montant vient du niveau, et le type (nouvelle / reinscription)
 * est deduit : tout cela fait foi cote serveur.
 */
export interface InscriptionPayload {
  eleve_id: number;
  classe_id: number;
  date_inscription?: string | null;
}

/** En modification, seules la classe et la date sont acceptees. */
export interface InscriptionUpdatePayload {
  classe_id?: number;
  date_inscription?: string;
}
