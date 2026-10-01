import { NgIf } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  OnInit
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { RouterLink } from '@angular/router';
import { AuthService } from 'src/app/auth/services/auth.service';
import { ConversationService } from 'src/app/auth/services/conversation.service';

/**
 * Le raccourci vers la messagerie, avec son compteur de non-lus.
 *
 * Le compteur est chargé une fois à l'ouverture de session, puis maintenu par
 * le WebSocket : le service incrémente son signal à chaque message reçu sur un
 * canal de service. Aucun sondage périodique n'est nécessaire — c'est
 * précisément ce que Reverb évite.
 *
 * Le bouton disparaît pour les rôles sans messagerie (l'enseignant), plutôt
 * que d'ouvrir un écran vide.
 */
@Component({
  selector: 'vex-toolbar-messagerie',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatButtonModule, MatIconModule, MatTooltipModule, NgIf, RouterLink],
  template: `
    <a
      *ngIf="visible"
      [matTooltip]="infobulle()"
      [routerLink]="lien"
      class="relative"
      mat-icon-button
      type="button">
      <mat-icon color="primary" svgIcon="mat:forum"></mat-icon>

      <!-- Le badge reste en primary : c'est un indicateur d'activité, il suit
           la couleur de l'établissement comme le reste de l'interface. -->
      <span
        *ngIf="nonLus() > 0"
        class="absolute -top-0.5 -right-0.5 bg-primary-600 text-white rounded-full text-[10px] font-semibold min-w-[18px] h-[18px] px-1 flex items-center justify-center">
        {{ nonLus() > 99 ? '99+' : nonLus() }}
      </span>
    </a>
  `
})
export class ToolbarMessagerieComponent implements OnInit {
  private readonly conversationService = inject(ConversationService);
  private readonly authService = inject(AuthService);
  private readonly destroyRef = inject(DestroyRef);

  readonly nonLus = this.conversationService.nonLus;

  private readonly role = this.authService.getRole();

  /** L'enseignant n'a pas de guichet : le raccourci n'aurait rien à ouvrir. */
  readonly visible = [
    'admin',
    'manager',
    'supervisor',
    'treasurer',
    'tuteur'
  ].includes(this.role);

  readonly lien =
    this.role === 'tuteur' ? '/index/tuteur/messagerie' : '/index/messagerie';

  readonly infobulle = computed(() => {
    const total = this.nonLus();

    if (total === 0) {
      return 'Messagerie';
    }

    return total === 1
      ? '1 message non lu'
      : `${total} messages non lus`;
  });

  ngOnInit(): void {
    if (!this.visible) {
      return;
    }

    this.conversationService
      .rafraichirNonLus()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe();

    // Les canaux de service sont écoutés dès la barre d'outils, et non
    // seulement depuis l'écran de messagerie : un agent doit voir le compteur
    // bouger pendant qu'il travaille ailleurs dans l'application.
    this.conversationService.ecouterServices();
  }
}
