import { Classe } from './Classe';
import { Tuteur, TuteurPayload } from './Tuteur';

/** Reflete App\Enums\SexeEnum. */
export type Sexe = 'M' | 'F';

/** Reflete App\Enums\GroupeSanguinEnum (la valeur sert aussi de libelle). */
export type GroupeSanguin =
  | 'A+' | 'A-' | 'B+' | 'B-'
  | 'AB+' | 'AB-' | 'O+' | 'O-';

export const GROUPES_SANGUINS: GroupeSanguin[] = [
  'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'
];

/** Reflete App\Enums\AptitudeSportiveEnum. */
export type AptitudeSportive = 'APTE' | 'APTE_PARTIEL' | 'INAPTE';

export const APTITUDES_SPORTIVES: { value: AptitudeSportive; label: string }[] = [
  { value: 'APTE', label: 'Apte' },
  { value: 'APTE_PARTIEL', label: 'Apte partiellement' },
  { value: 'INAPTE', label: 'Inapte' }
];

/**
 * Reflete App\Enums\StatutInscriptionEleveEnum : la situation de l'eleve
 * vis-a-vis de l'etablissement. A ne pas confondre avec le statut
 * administratif d'une inscription (EN_ATTENTE / VALIDEE / ANNULEE).
 */
export type StatutInscriptionEleve =
  | 'NOUVEAU'
  | 'REDOUBLANT'
  | 'REINSCRIT'
  | 'TRANSFERE';

export const STATUTS_INSCRIPTION: {
  value: StatutInscriptionEleve;
  label: string;
}[] = [
  { value: 'NOUVEAU', label: 'Nouveau' },
  { value: 'REDOUBLANT', label: 'Redoublant' },
  { value: 'REINSCRIT', label: 'Réinscrit' },
  { value: 'TRANSFERE', label: 'Transféré' }
];

export const NATIONALITE_PAR_DEFAUT = 'Sénégalaise';

/**
 * Vue minimale d'une inscription telle que serialisee dans l'historique de la
 * fiche eleve. Declaree ici plutot qu'importee de `Inscription.ts` : ce
 * dernier importe deja `Eleve`, l'import croise serait circulaire.
 */
export interface InscriptionEleve {
  id: number;
  numero_inscription: string;
  classe_id: number;
  annee_scolaire_id: number;
  statut_inscription: 'EN_ATTENTE' | 'VALIDEE' | 'ANNULEE';
  date_inscription: string;
  classe?: { id: number; nom: string };
  annee_scolaire?: { id: number; nom: string; en_cours: boolean };
}

export interface Eleve {
  id: number;
  matricule: string;

  // Identite
  nom: string;
  prenom: string;
  date_naissance: string;
  lieu_naissance: string | null;
  sexe: Sexe;
  nationalite: string;
  adresse: string | null;
  telephone: string | null;
  photo: string | null;

  // Antecedents medicaux
  groupe_sanguin: GroupeSanguin | null;
  allergies: string | null;
  maladies_chroniques: string | null;
  aptitude_sportive: AptitudeSportive;
  consignes_urgence: string | null;

  // Scolarite. Ces deux champs sont pilotes par le backend : date_inscription
  // est posee a la creation, classe_actuelle_id suit les inscriptions.
  classe_actuelle_id: number | null;
  statut_inscription: StatutInscriptionEleve;
  etablissement_origine: string | null;
  date_inscription: string;

  // Pere
  nom_pere: string | null;
  prenom_pere: string | null;
  telephone_pere: string | null;
  profession_pere: string | null;
  adresse_pere: string | null;

  // Mere (nom de jeune fille)
  nom_mere: string | null;
  prenom_mere: string | null;
  telephone_mere: string | null;
  profession_mere: string | null;
  adresse_mere: string | null;

  tuteur_id: number | null;

  // Relations. Eloquent serialise classeActuelle() sous la cle snake_case.
  tuteur?: Tuteur;
  classe_actuelle?: Classe;

  /** Historique renvoye par /eleves/show/{id} uniquement. */
  inscriptions?: InscriptionEleve[];

  // Accesseurs ajoutes par le modele.
  nom_complet?: string;
  age?: number | null;

  deleted_at?: string | null;
}

/**
 * Champs de l'eleve acceptes en ecriture. matricule est optionnel : le backend
 * le genere. date_inscription et classe_actuelle_id sont volontairement exclus,
 * le backend les ignore de toute facon.
 */
export type ElevePayload = Partial<
  Omit<
    Eleve,
    | 'id'
    | 'classe_actuelle_id'
    | 'date_inscription'
    | 'tuteur_id'
    | 'tuteur'
    | 'classe_actuelle'
    | 'inscriptions'
    | 'nom_complet'
    | 'age'
    | 'deleted_at'
  >
>;

/**
 * Le backend attend deux blocs distincts. Chacun est facultatif en
 * modification : envoyer `eleve` seul laisse le tuteur intact, et
 * inversement — c'est ce qui permet d'editer la fiche section par section.
 */
export interface EleveRequest {
  eleve?: ElevePayload;
  tuteur?: TuteurPayload;
}

/**
 * Compte-rendu d'un lot importe, tel que le renvoie POST /eleves/import.
 *
 * Les trois compteurs se lisent ensemble : un import est partiel par
 * construction (chaque ligne est traitee dans sa propre transaction cote
 * serveur), et le rapport dit ce qui est passe, ce qui a ete laisse de cote
 * et ce qui a echoue.
 */
export interface LigneRapportImport {
  /** Numero de la ligne dans le tableur d'origine. */
  ligne: number;
  nom: string;
  matricule: string | null;
  /** Present sur les lignes creees. */
  id?: number;
  /** Present sur les lignes ignorees ou en echec. */
  motif?: string;
}

export interface RapportImport {
  crees: number;
  ignores: number;
  echecs: number;
  details: {
    crees: LigneRapportImport[];
    ignores: LigneRapportImport[];
    echecs: LigneRapportImport[];
  };
}

/** Les sections editables de la fiche detail. */
export type EleveSection =
  | 'identite'
  | 'medical'
  | 'scolarite'
  | 'parents'
  | 'tuteur';
