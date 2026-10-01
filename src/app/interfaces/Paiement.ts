import { Inscription } from './Inscription';
import { User } from './User';

/** Reflete App\Enums\ModePaiementEnum. */
export type ModePaiement = 'ESPECES' | 'WAVE' | 'ORANGE_MONEY' | 'FREE_MONEY';

export const MODES_PAIEMENT: { value: ModePaiement; label: string }[] = [
  { value: 'ESPECES', label: 'Espèces' },
  { value: 'WAVE', label: 'Wave' },
  { value: 'ORANGE_MONEY', label: 'Orange Money' },
  { value: 'FREE_MONEY', label: 'Free Money' }
];

export interface PaiementInscription {
  id: number;
  inscription_id: number;
  utilisateur_id: number | null;
  numero_recu: string;
  montant: number;
  mode_paiement: ModePaiement;
  numero_transaction: string | null;
  date_paiement: string;

  // Relations chargees par le backend.
  inscription?: Inscription;
  utilisateur?: User;
}

/**
 * Versement encaisse lors de la validation d'une inscription. Le montant fait
 * foi cote serveur : au moins 1, au plus le reste a payer. numero_recu est
 * genere par le backend.
 */
export interface ValiderInscriptionPayload {
  montant: number;
  mode_paiement: ModePaiement;
  numero_transaction?: string | null;
  date_paiement?: string | null;
}
