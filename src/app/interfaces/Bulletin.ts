import { AnneeScolaire } from './AnneeScolaire';
import { Classe } from './Classe';
import { Eleve } from './Eleve';
import { Matiere } from './Matiere';
import { Periode } from './Periode';

/**
 * Reflète App\Enums\StatutBulletinEnum.
 *
 * Un bulletin publié est figé : ses valeurs ont été recopiées au moment de la
 * publication et ne suivent plus les corrections de notes. Pour le faire
 * évoluer il faut le dépublier, ce qui le ramène à l'état de brouillon.
 */
export type StatutBulletin = 'BROUILLON' | 'PUBLIE';

/** Reflète App\Enums\AppreciationEnum — libellés du bulletin papier. */
export type Appreciation =
  | 'TRES_BIEN'
  | 'BIEN'
  | 'ASSEZ_BIEN'
  | 'MOYEN'
  | 'PASSABLE'
  | 'INSUFFISANT'
  | 'FAIBLE';

/** Reflète App\Enums\MentionEnum. */
export type Mention = Appreciation;

/** Bloc de gauche du bulletin : l'appréciation générale du conseil. */
export type DecisionConseil =
  | 'SATISFAISANT_DOIT_CONTINUER'
  | 'PEUT_MIEUX_FAIRE'
  | 'INSUFFISANT'
  | 'RISQUE_DE_REDOUBLER'
  | 'RISQUE_EXCLUSION';

/** Bloc de droite du bulletin : distinction ou sanction. */
export type Distinction =
  | 'FELICITATIONS'
  | 'ENCOURAGEMENT'
  | 'TABLEAU_HONNEUR'
  | 'AVERTISSEMENT'
  | 'BLAME';

/**
 * Les libellés sont ceux du bulletin papier de l'établissement, y compris son
 * orthographe (« Risque de Rédoubler », « Blame » sans accent) : ce document
 * est signé et remis aux familles, sa forme fait partie de son identité.
 */
export const DECISIONS_CONSEIL: { value: DecisionConseil; label: string }[] = [
  { value: 'SATISFAISANT_DOIT_CONTINUER', label: 'Satisfaisant doit continuer' },
  { value: 'PEUT_MIEUX_FAIRE', label: 'Peut Mieux Faire' },
  { value: 'INSUFFISANT', label: 'Insuffisant' },
  { value: 'RISQUE_DE_REDOUBLER', label: 'Risque de Rédoubler' },
  { value: 'RISQUE_EXCLUSION', label: "Risque l'exclusion" }
];

export const DISTINCTIONS: { value: Distinction; label: string }[] = [
  { value: 'FELICITATIONS', label: 'Félicitations' },
  { value: 'ENCOURAGEMENT', label: 'Encouragement' },
  { value: 'TABLEAU_HONNEUR', label: "Tableau d'honneur" },
  { value: 'AVERTISSEMENT', label: 'Avertissement' },
  { value: 'BLAME', label: 'Blame' }
];

export const STATUTS_BULLETIN: { value: StatutBulletin; label: string }[] = [
  { value: 'BROUILLON', label: 'Brouillon' },
  { value: 'PUBLIE', label: 'Publié' }
];

/** Une matière sur le bulletin. */
export interface BulletinLigne {
  id: number;
  bulletin_id: number;
  matiere_id: number | null;

  /** Figé à la génération : c'est ce libellé qui s'imprime. */
  matiere_nom: string;
  ordre: number;

  moy_devoirs: string | number | null;
  composition: string | number | null;
  moyenne: string | number | null;
  coefficient: number | null;
  moy_x_coef: string | number | null;

  rang: number | null;
  rang_ex_aequo: boolean;
  appreciation: Appreciation | null;

  /** false = matière au programme mais sans note : tirets, hors du total. */
  notee: boolean;

  appreciation_libelle?: string | null;
  matiere?: Matiere;
}

export interface Bulletin {
  id: number;
  eleve_id: number;
  classe_id: number;
  periode_id: number;
  annee_scolaire_id: number;
  statut: StatutBulletin;

  // Identité figée à la génération : à préférer aux relations à l'affichage.
  eleve_nom: string;
  eleve_prenom: string;
  eleve_matricule: string | null;
  eleve_date_naissance: string | null;
  eleve_lieu_naissance: string | null;
  classe_nom: string;
  classe_redoublee: boolean;
  effectif_classe: number;

  total_coefficients: number;
  total_points: string | number | null;
  moyenne_generale: string | number | null;
  rang: number | null;
  rang_ex_aequo: boolean;
  mention: Mention | null;

  decision_conseil: DecisionConseil | null;
  distinction: Distinction | null;
  observations: string | null;

  /** Renseignés par le futur module d'assiduité ; null en attendant. */
  retards: number | null;
  absences: number | null;

  publie_par: number | null;
  publie_le: string | null;
  genere_le: string | null;

  // Attributs calculés côté backend (lecture seule).
  nom_complet?: string;
  statut_libelle?: string;
  mention_libelle?: string | null;
  decision_conseil_libelle?: string | null;
  distinction_libelle?: string | null;
  est_publie?: boolean;

  // Relations sérialisées par Eloquent.
  lignes?: BulletinLigne[];
  eleve?: Eleve;
  classe?: Classe;
  periode?: Periode;
  annee_scolaire?: AnneeScolaire;

  lignes_count?: number;
}

/** Référentiels renvoyés par /bulletins/meta. */
export interface BulletinMeta {
  statuts: { value: StatutBulletin; label: string }[];
  mentions: { value: Mention; label: string }[];
  decisions: { value: DecisionConseil; label: string }[];
  distinctions: { value: Distinction; label: string }[];
}

/** La génération porte toujours sur une classe entière : le rang en dépend. */
export interface GenererBulletinsPayload {
  classe_id: number;
  periode_id: number;
}

export type PublierBulletinsPayload = GenererBulletinsPayload;

export interface ConseilClassePayload {
  decision_conseil: DecisionConseil | null;
  distinction: Distinction | null;
  observations: string | null;
}

/** Réponse de /bulletins/generer. */
export interface GenerationResultat {
  bulletins: Bulletin[];
  classe: Classe;
  periode: Periode;
  effectif: number;

  /**
   * Vrai tant que la date limite de saisie des notes n'est pas passée : les
   * bulletins générés sont alors provisoires, ce que l'écran doit signaler.
   */
  saisie_encore_ouverte: boolean;
}
