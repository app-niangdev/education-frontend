import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import { catchError, map, Observable, of, tap } from 'rxjs';
import {
  Conversation,
  ConversationFiltres,
  ConversationMajEvent,
  ConversationPayload,
  ConversationReferentiels,
  Message,
  MessageEnvoyeEvent,
  ServiceDestinataire,
  StatutConversation
} from 'src/app/interfaces/Conversation';
import {
  initialPaginationMeta,
  LaravelApiResponse,
  PaginationMeta
} from 'src/app/response-type/Type';
import { environment } from 'src/environments/environment';
import { AuthService } from './auth.service';
import { EchoService } from './echo.service';

/**
 * La messagerie, côté client.
 *
 * Le service porte l'état partagé (liste des fils, messages du fil ouvert,
 * compteur de non-lus) sous forme de signaux, et branche le WebSocket sur ce
 * même état : un message arrivé par Reverb met à jour exactement les mêmes
 * signaux qu'un message envoyé en HTTP. Les composants n'ont donc jamais à
 * savoir d'où vient une mise à jour.
 */
@Injectable({ providedIn: 'root' })
export class ConversationService {
  private readonly http = inject(HttpClient);
  private readonly echo = inject(EchoService);
  private readonly authService = inject(AuthService);
  private readonly baseUrl = environment.apiUrl.replace(/\/+$/, '');

  private readonly conversationsSignal = signal<Conversation[]>([]);
  private readonly metaSignal = signal<PaginationMeta>(initialPaginationMeta);
  private readonly messagesSignal = signal<Message[]>([]);
  private readonly nonLusSignal = signal<number>(0);
  private readonly chargementSignal = signal<boolean>(false);

  readonly conversations = this.conversationsSignal.asReadonly();
  readonly meta = this.metaSignal.asReadonly();
  readonly messages = this.messagesSignal.asReadonly();
  readonly nonLus = this.nonLusSignal.asReadonly();
  readonly chargement = this.chargementSignal.asReadonly();

  /** Le fil actuellement ouvert : sert à savoir quel canal quitter. */
  private conversationCouranteId: number | null = null;

  // ─── Lecture ──────────────────────────────────────────────────────────────

  getList(
    page = 1,
    perPage = 15,
    filtres: ConversationFiltres = {}
  ): Observable<Conversation[]> {
    this.chargementSignal.set(true);

    return this.http
      .get<LaravelApiResponse<Conversation[]>>(
        `${this.baseUrl}/conversations/list`,
        { params: this.toParams(page, perPage, filtres) }
      )
      .pipe(
        map((reponse) => {
          const donnees = reponse.payload ?? [];
          this.conversationsSignal.set(donnees);
          if (reponse.meta) this.metaSignal.set(reponse.meta);
          this.chargementSignal.set(false);
          return donnees;
        }),
        catchError((erreur) => {
          console.error('Erreur chargement conversations:', erreur);
          this.chargementSignal.set(false);
          return of([]);
        })
      );
  }

  getById(id: number): Observable<Conversation | null> {
    return this.http
      .get<LaravelApiResponse<Conversation>>(
        `${this.baseUrl}/conversations/show/${id}`
      )
      .pipe(
        map((reponse) => reponse.payload ?? null),
        catchError((erreur) => {
          console.error('Erreur chargement conversation:', erreur);
          return of(null);
        })
      );
  }

  /**
   * Les messages d'un fil. Le backend marque le fil comme lu au passage : on
   * remet donc le compteur local à jour sans second appel.
   */
  getMessages(id: number, perPage = 50): Observable<Message[]> {
    return this.http
      .get<LaravelApiResponse<Message[]>>(
        `${this.baseUrl}/conversations/${id}/messages`,
        { params: new HttpParams().set('per_page', perPage) }
      )
      .pipe(
        map((reponse) => {
          const donnees = reponse.payload ?? [];
          this.messagesSignal.set(donnees);
          this.retirerNonLusLocaux(id);
          return donnees;
        }),
        catchError((erreur) => {
          console.error('Erreur chargement messages:', erreur);
          this.messagesSignal.set([]);
          return of([]);
        })
      );
  }

  getReferentiels(): Observable<ConversationReferentiels | null> {
    return this.http
      .get<LaravelApiResponse<ConversationReferentiels>>(
        `${this.baseUrl}/conversations/referentiels`
      )
      .pipe(
        map((reponse) => reponse.payload ?? null),
        catchError((erreur) => {
          console.error('Erreur chargement référentiels messagerie:', erreur);
          return of(null);
        })
      );
  }

  /** Le badge de la barre d'outils. */
  rafraichirNonLus(): Observable<number> {
    return this.http
      .get<LaravelApiResponse<{ total: number }>>(
        `${this.baseUrl}/conversations/non-lus`
      )
      .pipe(
        map((reponse) => {
          const total = reponse.payload?.total ?? 0;
          this.nonLusSignal.set(total);
          return total;
        }),
        catchError(() => of(0))
      );
  }

  // ─── Écriture ─────────────────────────────────────────────────────────────

  ouvrir(payload: ConversationPayload): Observable<Conversation | null> {
    return this.http
      .post<LaravelApiResponse<Conversation>>(
        `${this.baseUrl}/conversations/add`,
        payload
      )
      .pipe(
        map((reponse) => reponse.payload ?? null),
        tap((conversation) => {
          if (conversation) {
            this.conversationsSignal.update((liste) => [
              conversation,
              ...liste
            ]);
          }
        })
      );
  }

  /**
   * Envoie une réponse. Le message est ajouté localement à la réception de la
   * réponse HTTP, et non attendu du WebSocket : l'événement est diffusé avec
   * `toOthers()`, l'expéditeur ne le reçoit donc jamais en retour.
   */
  repondre(id: number, corps: string): Observable<Message | null> {
    return this.http
      .post<LaravelApiResponse<Message>>(
        `${this.baseUrl}/conversations/${id}/messages`,
        { corps }
      )
      .pipe(
        map((reponse) => reponse.payload ?? null),
        tap((message) => {
          if (message) {
            this.ajouterMessageLocal(message);
          }
        })
      );
  }

  prendreEnCharge(id: number): Observable<Conversation | null> {
    return this.http
      .post<LaravelApiResponse<Conversation>>(
        `${this.baseUrl}/conversations/${id}/prendre-en-charge`,
        {}
      )
      .pipe(
        map((reponse) => reponse.payload ?? null),
        tap((conversation) => this.remplacerDansListe(conversation))
      );
  }

  escalader(id: number, motif: string): Observable<Conversation | null> {
    return this.http
      .post<LaravelApiResponse<Conversation>>(
        `${this.baseUrl}/conversations/${id}/escalader`,
        { motif }
      )
      .pipe(
        map((reponse) => reponse.payload ?? null),
        tap((conversation) => this.remplacerDansListe(conversation))
      );
  }

  changerStatut(
    id: number,
    statut: StatutConversation
  ): Observable<Conversation | null> {
    return this.http
      .put<LaravelApiResponse<Conversation>>(
        `${this.baseUrl}/conversations/${id}/statut`,
        { statut }
      )
      .pipe(
        map((reponse) => reponse.payload ?? null),
        tap((conversation) => this.remplacerDansListe(conversation))
      );
  }

  /**
   * Télécharge le justificatif porté par un message.
   *
   * Passe par HttpClient et non par un simple lien `href` : la route exige le
   * jeton JWT, qu'un lien de navigation n'emporterait pas. Le PDF arrive donc
   * en mémoire, puis est remis au navigateur via une URL temporaire.
   */
  telechargerPieceJointe(
    conversationId: number,
    messageId: number,
    nomFichier: string
  ): Observable<boolean> {
    return this.http
      .get(
        `${this.baseUrl}/conversations/${conversationId}/messages/${messageId}/piece-jointe`,
        { responseType: 'blob' }
      )
      .pipe(
        map((blob) => {
          const url = URL.createObjectURL(blob);
          const lien = document.createElement('a');

          lien.href = url;
          lien.download = `${nomFichier}.pdf`;
          lien.click();

          // Sans révocation, le blob resterait en mémoire jusqu'au
          // rechargement de la page — un reçu pèse plus d'un mégaoctet.
          URL.revokeObjectURL(url);

          return true;
        }),
        catchError((erreur) => {
          console.error('Téléchargement du justificatif impossible:', erreur);
          return of(false);
        })
      );
  }

  marquerLu(id: number): Observable<boolean> {
    return this.http
      .post<LaravelApiResponse<null>>(
        `${this.baseUrl}/conversations/${id}/marquer-lu`,
        {}
      )
      .pipe(
        map(() => {
          this.retirerNonLusLocaux(id);
          return true;
        }),
        catchError(() => of(false))
      );
  }

  // ─── Temps réel ───────────────────────────────────────────────────────────

  /**
   * S'abonne au fil ouvert. Quitte le précédent au passage : sans cela, naviguer
   * d'un fil à l'autre empilerait les abonnements et un message arriverait
   * autant de fois qu'on a visité de fils.
   */
  ecouterConversation(id: number): void {
    if (this.conversationCouranteId !== null) {
      this.echo.quitter(`conversation.${this.conversationCouranteId}`);
    }

    this.conversationCouranteId = id;

    this.echo.ecouter<MessageEnvoyeEvent>(
      `conversation.${id}`,
      'message.envoye',
      (evenement) => this.surMessageRecu(evenement)
    );

    this.echo.ecouter<ConversationMajEvent>(
      `conversation.${id}`,
      'conversation.maj',
      (evenement) => this.surConversationMaj(evenement)
    );
  }

  /** Quitte le fil courant, sans toucher aux canaux de service. */
  quitterConversation(): void {
    if (this.conversationCouranteId === null) {
      return;
    }

    this.echo.quitter(`conversation.${this.conversationCouranteId}`);
    this.conversationCouranteId = null;
  }

  /**
   * S'abonne aux guichets que l'utilisateur traite. C'est ce qui fait
   * apparaître une demande chez un agent qui n'a rien ouvert.
   *
   * Un tuteur n'écoute aucun canal de service : il y verrait passer les
   * demandes de toutes les autres familles. Le backend refuse d'ailleurs
   * l'abonnement, ceci évite simplement une requête vouée au 403.
   */
  ecouterServices(): void {
    const role = this.authService.getRole();

    if (role === 'tuteur' || !role) {
      return;
    }

    for (const service of this.servicesDuRole(role)) {
      this.echo.ecouter<MessageEnvoyeEvent>(
        `service.${service}`,
        'message.envoye',
        (evenement) => this.surMessageServiceRecu(evenement)
      );

      this.echo.ecouter<ConversationMajEvent>(
        `service.${service}`,
        'conversation.maj',
        (evenement) => this.surConversationMaj(evenement)
      );
    }
  }

  /**
   * Les guichets qu'un rôle traite. Reproduit
   * ServiceDestinataireEnum::rolesTraitants() côté backend — la copie est
   * assumée : elle sert à ne pas demander d'abonnement voué à l'échec, jamais
   * à accorder un droit. C'est le serveur qui tranche à chaque abonnement.
   */
  private servicesDuRole(role: string): ServiceDestinataire[] {
    switch (role) {
      case 'admin':
      case 'manager':
        return [
          ServiceDestinataire.SCOLARITE,
          ServiceDestinataire.TRESORERIE,
          ServiceDestinataire.DIRECTION
        ];
      case 'supervisor':
        return [ServiceDestinataire.SCOLARITE];
      case 'treasurer':
        return [ServiceDestinataire.TRESORERIE];
      default:
        return [];
    }
  }

  /** Un message arrive sur le fil ouvert. */
  private surMessageRecu(evenement: MessageEnvoyeEvent): void {
    this.ajouterMessageLocal(this.versMessage(evenement));
    this.remonterDansListe(evenement);
  }

  /**
   * Un message arrive sur un canal de service, pour un fil qui n'est pas
   * forcément ouvert. On ne touche pas au flux de messages : seule la liste
   * bouge, et le badge s'incrémente si le fil n'est pas sous les yeux.
   */
  private surMessageServiceRecu(evenement: MessageEnvoyeEvent): void {
    if (evenement.conversation_id === this.conversationCouranteId) {
      return; // Déjà traité par le canal du fil.
    }

    this.remonterDansListe(evenement);

    if (!evenement.est_systeme) {
      this.nonLusSignal.update((total) => total + 1);
    }
  }

  private surConversationMaj(evenement: ConversationMajEvent): void {
    this.conversationsSignal.update((liste) =>
      liste.map((conversation) =>
        conversation.id === evenement.id
          ? {
              ...conversation,
              sujet: evenement.sujet,
              service: evenement.service ?? conversation.service,
              service_origine: evenement.service_origine,
              statut: evenement.statut ?? conversation.statut,
              agent_id: evenement.agent?.id ?? null,
              derniere_activite_at: evenement.derniere_activite_at
            }
          : conversation
      )
    );
  }

  private versMessage(evenement: MessageEnvoyeEvent): Message {
    return {
      id: evenement.id,
      conversation_id: evenement.conversation_id,
      expediteur_id: evenement.expediteur?.id ?? null,
      corps: evenement.corps,
      est_systeme: evenement.est_systeme,
      created_at: evenement.created_at,
      piece_jointe_type: evenement.piece_jointe_type ?? null,
      piece_jointe_id: evenement.piece_jointe_id ?? null,
      piece_jointe_libelle: evenement.piece_jointe_libelle ?? null,
      a_piece_jointe: evenement.a_piece_jointe ?? false,
      expediteur: evenement.expediteur
        ? {
            id: evenement.expediteur.id,
            full_name: evenement.expediteur.full_name,
            role: evenement.expediteur.role
          }
        : null
    };
  }

  /** Ajoute un message au flux, en écartant les doublons. */
  private ajouterMessageLocal(message: Message): void {
    this.messagesSignal.update((liste) =>
      liste.some((m) => m.id === message.id) ? liste : [...liste, message]
    );
  }

  /** Remonte un fil en tête de liste et met à jour son aperçu. */
  private remonterDansListe(evenement: MessageEnvoyeEvent): void {
    this.conversationsSignal.update((liste) => {
      const index = liste.findIndex((c) => c.id === evenement.conversation_id);

      if (index === -1) {
        return liste;
      }

      const conversation: Conversation = {
        ...liste[index],
        statut: evenement.conversation.statut ?? liste[index].statut,
        derniere_activite_at: evenement.conversation.derniere_activite_at,
        dernier_message: this.versMessage(evenement),
        non_lus_count:
          evenement.conversation_id === this.conversationCouranteId ||
          evenement.est_systeme
            ? liste[index].non_lus_count
            : (liste[index].non_lus_count ?? 0) + 1
      };

      return [conversation, ...liste.filter((_, i) => i !== index)];
    });
  }

  /** Le fil vient d'être lu : retire ses non-lus du badge et de la liste. */
  private retirerNonLusLocaux(id: number): void {
    const conversation = this.conversationsSignal().find((c) => c.id === id);
    const lus = conversation?.non_lus_count ?? 0;

    if (lus > 0) {
      this.nonLusSignal.update((total) => Math.max(0, total - lus));
    }

    this.conversationsSignal.update((liste) =>
      liste.map((c) => (c.id === id ? { ...c, non_lus_count: 0 } : c))
    );
  }

  private remplacerDansListe(conversation: Conversation | null): void {
    if (!conversation) {
      return;
    }

    this.conversationsSignal.update((liste) =>
      liste.map((c) => (c.id === conversation.id ? conversation : c))
    );
  }

  private toParams(
    page: number,
    perPage: number,
    filtres: ConversationFiltres
  ): HttpParams {
    let params = new HttpParams()
      .set('page', page)
      .set('per_page', perPage);

    for (const [cle, valeur] of Object.entries(filtres)) {
      if (valeur === null || valeur === undefined || valeur === '') {
        continue;
      }

      // Les booléens partent en « 1 » / « 0 », pas en « true » / « false » :
      // la règle `boolean` de Laravel refuse la chaîne « true » (elle n'admet
      // que 1, 0, "1", "0", true et false). `String(true)` produisait « true »
      // et la requête repartait en 422.
      params = params.set(
        cle,
        typeof valeur === 'boolean' ? (valeur ? '1' : '0') : String(valeur)
      );
    }

    return params;
  }

  /** Vide l'état local : à la déconnexion. */
  reinitialiser(): void {
    this.quitterConversation();
    this.conversationsSignal.set([]);
    this.messagesSignal.set([]);
    this.nonLusSignal.set(0);
  }
}
