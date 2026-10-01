import { AsyncPipe, DatePipe, NgClass, NgFor, NgIf } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  OnDestroy,
  OnInit,
  signal
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatRippleModule } from '@angular/material/core';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatDividerModule } from '@angular/material/divider';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatMenuModule } from '@angular/material/menu';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatTooltipModule } from '@angular/material/tooltip';
import {
  ActivatedRoute,
  NavigationEnd,
  Router,
  RouterLink,
  RouterLinkActive,
  RouterOutlet
} from '@angular/router';
import { fadeInUp400ms } from '@vex/animations/fade-in-up.animation';
import { stagger80ms } from '@vex/animations/stagger.animation';
import { VexLayoutService } from '@vex/services/vex-layout.service';
import { BehaviorSubject, combineLatest, debounceTime, distinctUntilChanged, filter, map, startWith } from 'rxjs';
import { AuthService } from 'src/app/auth/services/auth.service';
import { ConversationService } from 'src/app/auth/services/conversation.service';
import { EchoService } from 'src/app/auth/services/echo.service';
import {
  CLASSES_STATUT,
  Conversation,
  ConversationFiltres,
  LIBELLES_SERVICE,
  LIBELLES_STATUT,
  ServiceDestinataire,
  StatutConversation
} from 'src/app/interfaces/Conversation';
import { NouvelleConversationComponent } from './nouvelle-conversation/nouvelle-conversation.component';

/**
 * La messagerie : liste des fils à gauche, fil ouvert à droite.
 *
 * Reprend la structure du composant « chat » du thème Vex (mat-drawer +
 * router-outlet), branchée sur l'API et sur Reverb plutôt que sur les données
 * de démonstration.
 *
 * L'écran est le même pour un agent et pour un tuteur : ce que chacun voit est
 * décidé par le serveur, pas par un aiguillage ici. Seuls quelques libellés et
 * l'accès aux actions de traitement changent, via `estTuteur`.
 */
@Component({
  selector: 'vex-messagerie',
  templateUrl: './messagerie.component.html',
  styleUrls: ['./messagerie.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  animations: [fadeInUp400ms, stagger80ms],
  standalone: true,
  imports: [
    AsyncPipe,
    DatePipe,
    MatButtonModule,
    MatDialogModule,
    MatDividerModule,
    MatIconModule,
    MatInputModule,
    MatMenuModule,
    MatRippleModule,
    MatSidenavModule,
    MatTooltipModule,
    NgClass,
    NgFor,
    NgIf,
    ReactiveFormsModule,
    RouterLink,
    RouterLinkActive,
    RouterOutlet
  ]
})
export class MessagerieComponent implements OnInit, OnDestroy {
  private readonly conversationService = inject(ConversationService);
  private readonly authService = inject(AuthService);
  private readonly echo = inject(EchoService);
  private readonly layoutService = inject(VexLayoutService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly dialog = inject(MatDialog);
  private readonly destroyRef = inject(DestroyRef);

  readonly conversations = this.conversationService.conversations;
  readonly chargement = this.conversationService.chargement;

  readonly mobileQuery$ = this.layoutService.ltMd$;

  private readonly drawerOpen = new BehaviorSubject<boolean>(true);
  readonly drawerOpen$ = this.drawerOpen.asObservable();

  readonly recherche = new FormControl<string>('', { nonNullable: true });

  readonly estTuteur = this.authService.getRole() === 'tuteur';

  /**
   * Onglet actif : « à traiter » par défaut pour un agent, qui ouvre sur sa
   * corbeille.
   *
   * Un tuteur voit « tous » : les onglets lui sont masqués, et filtrer sur
   * « à traiter » lui cacherait ses propres demandes résolues — il n'aurait
   * alors aucun moyen de les retrouver.
   */
  readonly filtreActif = signal<'en_cours' | 'tous'>(
    this.estTuteur ? 'tous' : 'en_cours'
  );

  readonly libellesService = LIBELLES_SERVICE;
  readonly libellesStatut = LIBELLES_STATUT;
  readonly classesStatut = CLASSES_STATUT;

  ngOnInit(): void {
    this.charger();

    // Le WebSocket est ouvert dès l'entrée dans la messagerie : un agent doit
    // voir arriver une demande sans avoir ouvert de fil.
    this.conversationService.ecouterServices();

    this.recherche.valueChanges
      .pipe(
        debounceTime(350),
        distinctUntilChanged(),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe(() => this.charger());

    // Sur mobile, le tiroir se referme dès qu'un fil est ouvert (les deux
    // panneaux ne tiennent pas côte à côte) et se rouvre dès qu'on revient à
    // la liste (route enfant vide, sans :id) : sans ce second cas, revenir en
    // arrière laisserait l'écran sur un fond vide, sans liste ni fil.
    const filOuvert$ = this.router.events.pipe(
      filter((evenement) => evenement instanceof NavigationEnd),
      startWith(null),
      map(() => this.route.snapshot.firstChild?.paramMap.has('id') ?? false)
    );

    combineLatest([this.mobileQuery$, filOuvert$])
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(([estMobile, filOuvert]) =>
        this.drawerOpen.next(!estMobile || !filOuvert)
      );
  }

  ngOnDestroy(): void {
    // On quitte le fil courant, mais pas les canaux de service : le badge de
    // la barre d'outils doit continuer de vivre ailleurs dans l'application.
    this.conversationService.quitterConversation();
  }

  charger(): void {
    this.conversationService
      .getList(1, 30, this.filtres())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe();
  }

  changerFiltre(filtre: 'en_cours' | 'tous'): void {
    this.filtreActif.set(filtre);
    this.charger();
  }

  /** Ouvre le formulaire d'une nouvelle demande. */
  nouvelleConversation(): void {
    this.dialog
      .open(NouvelleConversationComponent, {
        width: '560px',
        maxWidth: '95vw',
        autoFocus: false
      })
      .afterClosed()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((creee?: Conversation) => {
        if (creee) {
          // Chemin relatif : le composant est monté sous deux URL distinctes
          // (/index/messagerie pour les agents, /index/tuteur/messagerie pour
          // les familles), coder la route en dur en casserait une des deux.
          this.router.navigate(['./', creee.id], { relativeTo: this.route });
          this.charger();
        }
      });
  }

  /** Aperçu du dernier message, tronqué par le gabarit. */
  apercu(conversation: Conversation): string {
    const message = conversation.dernier_message;

    if (!message) {
      return 'Aucun message';
    }

    return message.est_systeme ? `— ${message.corps}` : message.corps;
  }

  /**
   * Ce qui identifie le fil dans la liste : le service pour un tuteur (il
   * écrit à un guichet), le nom de la famille pour un agent (il traite des
   * demandes venant de familles différentes).
   */
  interlocuteur(conversation: Conversation): string {
    if (this.estTuteur) {
      return this.libellesService[conversation.service] ?? conversation.service;
    }

    const tuteur = conversation.tuteur;

    return tuteur
      ? `${tuteur.prenom} ${tuteur.nom}`.trim()
      : 'Tuteur inconnu';
  }

  /** Initiales affichées à défaut de photo : les tuteurs n'en ont pas. */
  initiales(conversation: Conversation): string {
    const source = this.interlocuteur(conversation);

    return source
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((mot) => mot.charAt(0).toUpperCase())
      .join('');
  }

  trackById(_: number, conversation: Conversation): number {
    return conversation.id;
  }

  drawerChange(ouvert: boolean): void {
    this.drawerOpen.next(ouvert);
  }

  ouvrirTiroir(): void {
    this.drawerOpen.next(true);
  }

  private filtres(): ConversationFiltres {
    const filtres: ConversationFiltres = {};

    const recherche = this.recherche.value.trim();
    if (recherche) {
      filtres.search = recherche;
    }

    if (this.filtreActif() === 'en_cours') {
      filtres.en_cours = true;
    }

    return filtres;
  }

  protected readonly ServiceDestinataire = ServiceDestinataire;
  protected readonly StatutConversation = StatutConversation;
}
