import { DatePipe, NgClass, NgFor, NgIf } from '@angular/common';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  DestroyRef,
  effect,
  inject,
  OnDestroy,
  OnInit,
  signal,
  ViewChild
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatDividerModule } from '@angular/material/divider';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { VexScrollbarComponent } from '@vex/components/vex-scrollbar/vex-scrollbar.component';
import { map } from 'rxjs/operators';
import { AuthService } from 'src/app/auth/services/auth.service';
import { ConversationService } from 'src/app/auth/services/conversation.service';
import { NotificationService } from 'src/app/auth/services/Notification.service';
import {
  CLASSES_STATUT,
  Conversation,
  LIBELLES_SERVICE,
  LIBELLES_STATUT,
  Message,
  ServiceDestinataire,
  StatutConversation
} from 'src/app/interfaces/Conversation';
import { EscaladeDialogComponent } from '../escalade-dialog/escalade-dialog.component';

/**
 * Un fil de discussion : en-tête, messages, zone de saisie.
 *
 * Le composant s'abonne au canal du fil à l'ouverture et le quitte à la
 * sortie. Les messages qu'il affiche viennent du signal du service : peu
 * importe qu'ils soient arrivés par la réponse HTTP d'un envoi ou poussés par
 * Reverb, la source est la même.
 */
@Component({
  selector: 'vex-conversation-fil',
  templateUrl: './conversation-fil.component.html',
  styleUrls: ['./conversation-fil.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [
    DatePipe,
    MatButtonModule,
    MatDialogModule,
    MatDividerModule,
    MatIconModule,
    MatMenuModule,
    MatTooltipModule,
    NgClass,
    NgFor,
    NgIf,
    ReactiveFormsModule,
    RouterLink,
    VexScrollbarComponent
  ]
})
export class ConversationFilComponent implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly conversationService = inject(ConversationService);
  private readonly authService = inject(AuthService);
  private readonly notification = inject(NotificationService);
  private readonly dialog = inject(MatDialog);
  private readonly cd = inject(ChangeDetectorRef);
  private readonly destroyRef = inject(DestroyRef);

  @ViewChild(VexScrollbarComponent) scrollbar?: VexScrollbarComponent;

  readonly messages = this.conversationService.messages;
  readonly conversation = signal<Conversation | null>(null);
  readonly envoiEnCours = signal(false);

  /**
   * Id du message dont le justificatif est en cours de téléchargement.
   *
   * Un id plutôt qu'un booléen : plusieurs reçus coexistent dans le fil, et un
   * drapeau global les désactiverait tous pendant qu'un seul se télécharge.
   */
  readonly telechargementEnCours = signal<number | null>(null);

  readonly saisie = new FormControl<string>('', { nonNullable: true });

  readonly estTuteur = this.authService.getRole() === 'tuteur';
  private readonly utilisateurId = this.authService.getCurrentUserSync()?.id;

  readonly libellesService = LIBELLES_SERVICE;
  readonly libellesStatut = LIBELLES_STATUT;
  readonly classesStatut = CLASSES_STATUT;

  constructor() {
    // Chaque arrivée de message ramène la vue en bas : c'est ce qu'on attend
    // d'une messagerie, et cela vaut aussi pour les messages poussés par le
    // WebSocket, qu'aucun geste de l'utilisateur ne précède.
    effect(() => {
      this.messages();
      queueMicrotask(() => this.defilerEnBas());
    });
  }

  ngOnInit(): void {
    this.route.paramMap
      .pipe(
        map((params) => Number(params.get('id'))),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe((id) => {
        if (!id || Number.isNaN(id)) {
          return;
        }

        this.charger(id);
      });
  }

  ngOnDestroy(): void {
    this.conversationService.quitterConversation();
  }

  private charger(id: number): void {
    this.conversationService
      .getById(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((conversation) => {
        this.conversation.set(conversation);
        this.cd.markForCheck();
      });

    this.conversationService
      .getMessages(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.cd.markForCheck());

    this.conversationService.ecouterConversation(id);
  }

  envoyer(): void {
    const corps = this.saisie.value.trim();
    const fil = this.conversation();

    if (!corps || !fil || this.envoiEnCours()) {
      return;
    }

    this.envoiEnCours.set(true);

    this.conversationService
      .repondre(fil.id, corps)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.saisie.setValue('');
          this.envoiEnCours.set(false);
          this.cd.markForCheck();
        },
        error: (erreur) => {
          this.envoiEnCours.set(false);
          this.notification.error(
            erreur?.error?.message ?? "Le message n'a pas pu être envoyé."
          );
          this.cd.markForCheck();
        }
      });
  }

  /**
   * Entrée envoie, Maj+Entrée passe à la ligne. Une famille qui explique une
   * situation a besoin d'aérer son message ; l'envoi accidentel à la première
   * ligne serait plus gênant que l'inverse.
   */
  surEntree(evenement: Event): void {
    const clavier = evenement as KeyboardEvent;

    if (clavier.shiftKey) {
      return;
    }

    clavier.preventDefault();
    this.envoyer();
  }

  prendreEnCharge(): void {
    const fil = this.conversation();

    if (!fil) {
      return;
    }

    this.conversationService
      .prendreEnCharge(fil.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (maj) => {
          if (maj) {
            this.conversation.set(maj);
          }
          this.rechargerMessages(fil.id);
          this.notification.success('Demande prise en charge.');
        },
        error: (erreur) =>
          this.notification.error(
            erreur?.error?.message ?? 'Action impossible.'
          )
      });
  }

  /**
   * Remonte le dossier à la direction. Le motif est obligatoire côté serveur :
   * la direction reçoit un dossier qu'elle n'a pas suivi.
   */
  escalader(): void {
    const fil = this.conversation();

    if (!fil) {
      return;
    }

    this.dialog
      .open(EscaladeDialogComponent, { width: '480px', maxWidth: '95vw' })
      .afterClosed()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((motif?: string) => {
        if (!motif) {
          return;
        }

        this.conversationService
          .escalader(fil.id, motif)
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe({
            next: (maj) => {
              if (maj) {
                this.conversation.set(maj);
              }
              this.rechargerMessages(fil.id);
              this.notification.success('Demande escaladée à la direction.');
            },
            error: (erreur) =>
              this.notification.error(
                erreur?.error?.message ?? "L'escalade a échoué."
              )
          });
      });
  }

  changerStatut(statut: StatutConversation): void {
    const fil = this.conversation();

    if (!fil) {
      return;
    }

    this.conversationService
      .changerStatut(fil.id, statut)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (maj) => {
          if (maj) {
            this.conversation.set(maj);
          }
          this.rechargerMessages(fil.id);
          this.notification.success('Statut mis à jour.');
        },
        error: (erreur) =>
          this.notification.error(
            erreur?.error?.message ?? 'Changement de statut impossible.'
          )
      });
  }

  /** Les messages de service viennent d'être ajoutés côté serveur. */
  private rechargerMessages(id: number): void {
    this.conversationService
      .getMessages(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.cd.markForCheck());
  }

  /**
   * Récupère le justificatif attaché à un message.
   *
   * Le PDF est régénéré côté serveur depuis le paiement : rien n'est stocké,
   * et le document reflète toujours l'état comptable réel.
   */
  telecharger(message: Message): void {
    const fil = this.conversation();

    if (!fil || !message.a_piece_jointe || this.telechargementEnCours()) {
      return;
    }

    this.telechargementEnCours.set(message.id);

    // Le libellé sert de nom de fichier : « Reçu n° R-0042 » devient
    // « recu-n-r-0042.pdf », ce qu'une famille retrouve dans ses documents.
    const nom = (message.piece_jointe_libelle ?? 'justificatif')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');

    this.conversationService
      .telechargerPieceJointe(fil.id, message.id, nom)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (ok) => {
          this.telechargementEnCours.set(null);

          if (!ok) {
            this.notification.error(
              "Le justificatif n'a pas pu être téléchargé."
            );
          }

          this.cd.markForCheck();
        },
        error: () => {
          this.telechargementEnCours.set(null);
          this.notification.error(
            "Le justificatif n'a pas pu être téléchargé."
          );
          this.cd.markForCheck();
        }
      });
  }

  /** Vrai si le message est de l'utilisateur courant : il s'aligne à droite. */
  estDeMoi(message: Message): boolean {
    return (
      !message.est_systeme && message.expediteur_id === this.utilisateurId
    );
  }

  auteur(message: Message): string {
    const expediteur = message.expediteur;

    if (!expediteur) {
      return 'Système';
    }

    if (expediteur.full_name) {
      return expediteur.full_name;
    }

    return `${expediteur.first_name ?? ''} ${expediteur.last_name ?? ''}`.trim();
  }

  initiales(message: Message): string {
    return this.auteur(message)
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((mot) => mot.charAt(0).toUpperCase())
      .join('');
  }

  /** Un fil archivé n'accepte plus de message : la saisie est masquée. */
  get peutEcrire(): boolean {
    const fil = this.conversation();

    return !!fil && fil.statut !== StatutConversation.ARCHIVEE;
  }

  /** Les actions de traitement n'ont de sens que pour un agent. */
  get peutTraiter(): boolean {
    return !this.estTuteur && !!this.conversation();
  }

  /** L'escalade n'a plus d'objet une fois le dossier chez la direction. */
  get peutEscalader(): boolean {
    const fil = this.conversation();

    return (
      this.peutTraiter &&
      !!fil &&
      fil.service !== ServiceDestinataire.DIRECTION &&
      fil.statut !== StatutConversation.ARCHIVEE
    );
  }

  entete(): string {
    const fil = this.conversation();

    if (!fil) {
      return '';
    }

    if (this.estTuteur) {
      return this.libellesService[fil.service] ?? fil.service;
    }

    return fil.tuteur
      ? `${fil.tuteur.prenom} ${fil.tuteur.nom}`.trim()
      : 'Tuteur';
  }

  trackById(_: number, message: Message): number {
    return message.id;
  }

  private defilerEnBas(): void {
    const element = this.scrollbar?.scrollbarRef?.getScrollElement();
    const contenu = this.scrollbar?.scrollbarRef?.getContentElement();

    if (!element || !contenu) {
      return;
    }

    element.scrollTo({ top: contenu.clientHeight, behavior: 'smooth' });
  }

  protected readonly StatutConversation = StatutConversation;
}
