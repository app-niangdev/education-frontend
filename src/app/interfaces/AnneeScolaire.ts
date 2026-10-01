import { Periode } from './Periode';

export type StatutAnneeScolaire = 'AVENIR' | 'ENCOURS' | 'CLOTURER';

export interface AnneeScolaire {
  id: number;
  nom: string;
  date_debut: string;
  date_fin: string;
  /**
   * Lecture seule : le serveur n'accepte jamais ce champ en écriture et un
   * index unique en base garantit qu'une seule année le porte. Il bascule
   * lors de la clôture de l'année.
   */
  en_cours: boolean;
  statut: StatutAnneeScolaire;
  periodes?: Periode[];
}

/** Champs réellement acceptés par l'API en modification. */
export type AnneeScolairePayload = Omit<
  AnneeScolaire,
  'id' | 'periodes' | 'en_cours'
>;

/**
 * À la création, `en_cours` est accepté en plus — mais uniquement pour amorcer,
 * tant qu'aucune année n'est active. Le serveur refuse la demande au-delà.
 */
export type AnneeScolaireCreatePayload = AnneeScolairePayload & {
  en_cours?: boolean;
};
