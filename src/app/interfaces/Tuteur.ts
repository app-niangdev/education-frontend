/** Reflete App\Enums\LienParenteEnum. */
export type LienParente =
  | 'PERE'
  | 'MERE'
  | 'ONCLE'
  | 'TANTE'
  | 'GRAND_PARENT'
  | 'AUTRE';

export const LIENS_PARENTE: { value: LienParente; label: string }[] = [
  { value: 'PERE', label: 'Père' },
  { value: 'MERE', label: 'Mère' },
  { value: 'ONCLE', label: 'Oncle' },
  { value: 'TANTE', label: 'Tante' },
  { value: 'GRAND_PARENT', label: 'Grand-parent' },
  { value: 'AUTRE', label: 'Autre' }
];

/**
 * Le NIN n'est exige par le backend que lorsque le tuteur n'est ni le pere
 * ni la mere : l'eleve vit alors chez un tiers et le tuteur porte seul les
 * engagements financiers.
 */
export function tuteurEstUnTiers(lien: LienParente | null | undefined): boolean {
  return !!lien && lien !== 'PERE' && lien !== 'MERE';
}

export interface Tuteur {
  id: number;
  lien_parente: LienParente;
  nom: string;
  prenom: string;
  nin: string | null;
  telephone_principal: string;
  telephone_secondaire: string | null;
  email: string | null;
  profession: string | null;
  adresse: string;

  /**
   * Le compte de connexion, quand il existe. Nul tant que l'école n'a pas
   * ouvert l'accès : la fiche tuteur naît avec l'inscription de l'enfant, le
   * compte se crée séparément, à la demande.
   *
   * C'est ce champ qui distingue « le tuteur peut se connecter à l'espace
   * famille » de « il n'est qu'un contact ».
   */
  user_id?: number | null;

  /** Accesseur `nom_complet` ajoute par le modele Eloquent. */
  nom_complet?: string;
}

/**
 * `id` permet de rattacher une fiche tuteur existante (fratrie).
 *
 * `user_id` en est exclu : le rattachement d'un compte ne se pilote pas depuis
 * le formulaire élève, mais par les routes dédiées (`/tuteurs/{id}/compte`).
 */
export type TuteurPayload = Partial<Pick<Tuteur, 'id'>> &
  Omit<Tuteur, 'id' | 'nom_complet' | 'user_id'>;

/**
 * Ce qu'accepte le formulaire élève quand il rattache une fiche existante :
 * l'`id` suffit, les coordonnées sont déjà en base et le serveur les conserve.
 * Les champs restent optionnels pour ce seul cas — une saisie complète passe
 * toujours par `TuteurPayload`.
 */
export type TuteurRattachement = Pick<Tuteur, 'id'> &
  Partial<Omit<Tuteur, 'id' | 'nom_complet' | 'user_id'>>;

/**
 * Une entrée de l'annuaire, telle que la renvoie `/tuteurs/rechercher`.
 *
 * `eleves_count` vient du `withCount('eleves')` côté serveur : c'est ce qui
 * permet de distinguer deux homonymes au moment de choisir.
 */
export interface TuteurRecherche extends Tuteur {
  eleves_count: number;
}
