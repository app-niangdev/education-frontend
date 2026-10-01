/**
 * La messagerie entre les tuteurs et les services de l'établissement.
 *
 * Les valeurs des énumérations reprennent celles du backend
 * (ServiceDestinataireEnum, StatutConversationEnum) : elles voyagent telles
 * quelles dans les payloads, un écart ici casserait silencieusement les
 * filtres.
 */

/** Les guichets de l'établissement. */
export enum ServiceDestinataire {
  SCOLARITE = 'SCOLARITE',
  TRESORERIE = 'TRESORERIE',
  DIRECTION = 'DIRECTION'
}

/**
 * Le cycle de vie d'un fil. ESCALADEE n'est jamais choisi depuis un menu :
 * il résulte de l'action « escalader », qui exige un motif.
 */
export enum StatutConversation {
  OUVERTE = 'OUVERTE',
  EN_COURS = 'EN_COURS',
  ESCALADEE = 'ESCALADEE',
  RESOLUE = 'RESOLUE',
  ARCHIVEE = 'ARCHIVEE'
}

/** L'auteur d'un message. Nul pour les messages de service. */
export interface MessageExpediteur {
  id: number;
  first_name?: string;
  last_name?: string;
  full_name?: string;
  role_id?: number;
  role?: { id: number; name: string; label: string } | string | null;
}

/** Ce qu'un message peut porter comme justificatif. */
export enum PieceJointeType {
  RECU_INSCRIPTION = 'RECU_INSCRIPTION',
  RECU_MENSUALITE = 'RECU_MENSUALITE',
  FACTURE_MENSUALITES = 'FACTURE_MENSUALITES'
}

export interface Message {
  id: number;
  conversation_id: number;
  expediteur_id: number | null;
  corps: string;
  /** Message de service (prise en charge, escalade) : rendu différemment. */
  est_systeme: boolean;
  created_at: string;
  updated_at?: string;
  expediteur?: MessageExpediteur | null;

  /**
   * Justificatif attaché (reçu de paiement).
   *
   * Le PDF n'est pas stocké : ces champs disent comment le régénérer, et la
   * route `/conversations/{id}/messages/{messageId}/piece-jointe` s'en charge
   * après avoir vérifié l'accès au fil.
   */
  piece_jointe_type?: PieceJointeType | null;
  piece_jointe_id?: number | null;
  /** Ce qui s'affiche sur le bouton (« Reçu n° R-0042 »). */
  piece_jointe_libelle?: string | null;
  /** Accesseur du backend : évite de tester deux colonnes. */
  a_piece_jointe?: boolean;
}

export interface ConversationTuteur {
  id: number;
  nom: string;
  prenom: string;
  nom_complet?: string;
  telephone_principal?: string;
  email?: string | null;
}

export interface ConversationEleve {
  id: number;
  nom: string;
  prenom: string;
  matricule?: string;
}

export interface Conversation {
  id: number;
  tuteur_id: number;
  eleve_id: number | null;
  service: ServiceDestinataire;
  sujet: string;
  statut: StatutConversation;
  agent_id: number | null;
  /** Renseigné après une escalade : d'où vient le dossier. */
  service_origine: ServiceDestinataire | null;
  escaladee_at: string | null;
  motif_escalade: string | null;
  derniere_activite_at: string | null;
  created_at?: string;

  tuteur?: ConversationTuteur;
  eleve?: ConversationEleve | null;
  agent?: MessageExpediteur | null;
  dernier_message?: Message | null;

  /**
   * Ajouté par le backend pour l'utilisateur courant uniquement (sous-requête
   * de ConversationRepository) : absent des fils d'un tuteur, où le compteur
   * n'est pas calculé côté liste.
   */
  non_lus_count?: number;
}

/** Ce qu'on envoie pour ouvrir un fil. */
export interface ConversationPayload {
  /** Ignoré quand un tuteur écrit : le backend prend l'id de son compte. */
  tuteur_id?: number | null;
  eleve_id?: number | null;
  service: ServiceDestinataire;
  sujet: string;
  corps: string;
}

export interface ConversationFiltres {
  search?: string;
  service?: ServiceDestinataire | '';
  statut?: StatutConversation | '';
  eleve_id?: number | null;
  agent_id?: number | null;
  /** Raccourci « à traiter » : tout sauf résolu et archivé. */
  en_cours?: boolean;
}

export interface OptionReferentiel {
  valeur: string;
  libelle: string;
}

/**
 * Ce que le demandeur peut choisir. Le backend adapte le contenu au rôle :
 * un tuteur ne reçoit que deux services (la direction ne se saisit pas) et la
 * liste de ses propres enfants.
 */
export interface ConversationReferentiels {
  services: OptionReferentiel[];
  statuts: OptionReferentiel[];
  eleves?: ConversationEleve[];
  compteurs?: Record<string, number>;
}

/** La charge utile poussée par le WebSocket sur `message.envoye`. */
export interface MessageEnvoyeEvent {
  id: number;
  conversation_id: number;
  corps: string;
  est_systeme: boolean;
  created_at: string;
  /** Justificatif attaché : voyage avec l'événement pour que le bouton de
   *  téléchargement apparaisse sans recharger la page. */
  piece_jointe_type?: PieceJointeType | null;
  piece_jointe_id?: number | null;
  piece_jointe_libelle?: string | null;
  a_piece_jointe?: boolean;
  expediteur: {
    id: number;
    full_name: string;
    role: string | null;
  } | null;
  conversation: {
    id: number;
    sujet: string;
    service: ServiceDestinataire | null;
    statut: StatutConversation | null;
    derniere_activite_at: string | null;
  };
}

/** La charge utile poussée sur `conversation.maj`. */
export interface ConversationMajEvent {
  id: number;
  sujet: string;
  service: ServiceDestinataire | null;
  service_origine: ServiceDestinataire | null;
  statut: StatutConversation | null;
  agent: { id: number; full_name: string } | null;
  derniere_activite_at: string | null;
}

/** Libellés affichables, alignés sur ceux du backend. */
export const LIBELLES_SERVICE: Record<ServiceDestinataire, string> = {
  [ServiceDestinataire.SCOLARITE]: 'Scolarité & surveillance',
  [ServiceDestinataire.TRESORERIE]: 'Trésorerie',
  [ServiceDestinataire.DIRECTION]: 'Direction'
};

export const LIBELLES_STATUT: Record<StatutConversation, string> = {
  [StatutConversation.OUVERTE]: 'Ouverte',
  [StatutConversation.EN_COURS]: 'En cours de traitement',
  [StatutConversation.ESCALADEE]: 'Escaladée à la direction',
  [StatutConversation.RESOLUE]: 'Résolue',
  [StatutConversation.ARCHIVEE]: 'Archivée'
};

/**
 * Teinte du badge de statut.
 *
 * Volontairement en gris/vert/ambre/rouge et non en `primary` : la couleur
 * primaire est un paramètre d'établissement qui peut virer au vert ou au
 * rouge, et un statut qui prendrait cette teinte deviendrait indistinct de
 * l'accentuation générale. Les statuts gardent donc un code couleur stable.
 */
export const CLASSES_STATUT: Record<StatutConversation, string> = {
  [StatutConversation.OUVERTE]:
    'text-amber-700 bg-amber-100 dark:text-amber-200 dark:bg-amber-900/30',
  [StatutConversation.EN_COURS]:
    'text-sky-700 bg-sky-100 dark:text-sky-200 dark:bg-sky-900/30',
  [StatutConversation.ESCALADEE]:
    'text-rose-700 bg-rose-100 dark:text-rose-200 dark:bg-rose-900/30',
  [StatutConversation.RESOLUE]:
    'text-emerald-700 bg-emerald-100 dark:text-emerald-200 dark:bg-emerald-900/30',
  [StatutConversation.ARCHIVEE]:
    'text-gray-600 bg-gray-200 dark:text-gray-300 dark:bg-gray-700/40'
};
