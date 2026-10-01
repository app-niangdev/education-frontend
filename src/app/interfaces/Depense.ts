import { AnneeScolaire } from './AnneeScolaire';

/** Un utilisateur, tel que sérialisé en relation par le backend. */
interface UtilisateurBref {
  id: number;
  first_name?: string;
  last_name?: string;
  email?: string;
}

/**
 * Une dépense de l'établissement, rattachée à une année scolaire.
 * `categorie` et `mode_paiement` sont des valeurs d'enum ; les `_libelle`
 * associés sont ajoutés par le backend pour l'affichage.
 */
export interface Depense {
  id: number;
  annee_scolaire_id: number;
  utilisateur_id: number | null;
  libelle: string;
  categorie: string;
  categorie_libelle?: string;
  montant: number;
  mode_paiement: string;
  mode_paiement_libelle?: string;
  beneficiaire: string | null;
  reference: string | null;
  date_depense: string;
  description: string | null;

  /**
   * Où en est la dépense dans son circuit de validation. Une dépense naît
   * toujours `EN_ATTENTE` : seul un manager (ou l'admin) l'engage. Tant
   * qu'elle ne l'est pas, elle ne compte ni dans les totaux ni dans le bilan.
   */
  statut: StatutDepense;
  statut_libelle?: string;

  /** Qui a tranché, et quand. Nuls tant qu'aucune décision n'est prise. */
  validateur_id: number | null;
  valide_le: string | null;

  /** Renseigné au refus seulement : il explique ce qui a été écarté. */
  motif_refus: string | null;

  annee_scolaire?: AnneeScolaire;
  utilisateur?: UtilisateurBref;
  validateur?: UtilisateurBref;
}

/** Reflète App\Enums\StatutDepenseEnum. */
export type StatutDepense = 'EN_ATTENTE' | 'VALIDEE' | 'REFUSEE';

/** Charge utile de création : l'année scolaire est déduite si omise. */
export interface DepensePayload {
  annee_scolaire_id?: number | null;
  libelle: string;
  categorie: string;
  montant: number;
  mode_paiement: string;
  beneficiaire?: string | null;
  reference?: string | null;
  date_depense: string;
  description?: string | null;
}

/** En modification, tous les champs sont optionnels. */
export type DepenseUpdatePayload = Partial<DepensePayload>;

/** Une option d'un référentiel (catégorie, mode de paiement). */
export interface OptionReferentiel {
  valeur: string;
  libelle: string;
}

export interface DepenseReferentiels {
  categories: OptionReferentiel[];
  modes_paiement: OptionReferentiel[];
  statuts: OptionReferentiel[];
}

/** Une catégorie dans la répartition des totaux. */
export interface TotalCategorie {
  categorie: string;
  libelle: string;
  total: number;
  nombre: number;
}

/**
 * `total` et `nombre` ne portent que sur les dépenses VALIDÉES : ce qui attend
 * une décision est compté à part, jamais additionné au reste.
 */
export interface DepenseTotaux {
  total: number;
  nombre: number;
  total_en_attente: number;
  nombre_en_attente: number;
  par_categorie: TotalCategorie[];
}

/** Un mois de l'année scolaire, pour le filtre mensuel. */
export interface MoisAnneeScolaire {
  mois: number;
  annee: number;
  libelle: string;
  total: number;
  nombre: number;
}

export interface MoisAnneeEnCours {
  annee_scolaire: AnneeScolaire | null;
  mois: MoisAnneeScolaire[];
}

/**
 * Les critères de filtrage. Les trois filtres de date s'excluent côté backend :
 * `date` (jour précis) prime sur l'intervalle, qui prime sur le mois.
 */
export interface DepenseFiltres {
  search?: string;
  categorie?: string;
  mode_paiement?: string;
  statut?: StatutDepense | '';
  date?: string;
  date_from?: string;
  date_to?: string;
  mois?: number;
  annee?: number;
  toutes_annees?: boolean;
}
