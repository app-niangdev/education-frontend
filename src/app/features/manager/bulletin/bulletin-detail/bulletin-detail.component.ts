import { CommonModule } from '@angular/common';
import { Component, inject, OnInit } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Router } from '@angular/router';
import { fadeInRight400ms } from '@vex/animations/fade-in-right.animation';
import { scaleIn400ms } from '@vex/animations/scale-in.animation';
import { stagger40ms } from '@vex/animations/stagger.animation';
import { AuthService } from 'src/app/auth/services/auth.service';
import { BulletinService } from 'src/app/auth/services/bulletin.service';
import { NotificationService } from 'src/app/auth/services/Notification.service';
import {
  ConfirmationDialogData,
  ConfirmatiomModalComponent
} from 'src/app/features/confirmatiom-modal/confirmatiom-modal.component';
import {
  Bulletin,
  DECISIONS_CONSEIL,
  DISTINCTIONS
} from 'src/app/interfaces/Bulletin';
import { ConseilClasseDialogComponent } from '../conseil-classe-dialog/conseil-classe-dialog.component';
import {
  BulletinContexte,
  lireBulletinIdDepuisState,
  lireContexteDepuisState,
  ROUTE_BULLETINS,
  STATE_BULLETIN_CONTEXTE
} from '../bulletin-navigation';

/**
 * Le detail d'un bulletin : le meme tableau que le PDF, plus les actions.
 *
 * L'identifiant est lu dans le constructeur : `getCurrentNavigation()` n'est
 * renseigne que pendant la navigation et vaut deja null en ngOnInit.
 */
@Component({
  selector: 'vex-bulletin-detail',
  templateUrl: './bulletin-detail.component.html',
  styleUrls: ['./bulletin-detail.component.scss'],
  animations: [stagger40ms, scaleIn400ms, fadeInRight400ms],
  standalone: true,
  imports: [
    CommonModule,
    MatIconModule,
    MatButtonModule,
    MatTooltipModule,
    MatProgressSpinnerModule,
    MatDialogModule
  ]
})
export class BulletinDetailComponent implements OnInit {
  private readonly bulletinService = inject(BulletinService);
  private readonly notificationService = inject(NotificationService);
  private readonly authService = inject(AuthService);
  private readonly dialog = inject(MatDialog);
  private readonly router = inject(Router);

  readonly decisions = DECISIONS_CONSEIL;
  readonly distinctions = DISTINCTIONS;

  private readonly bulletinId: number | null;
  private readonly contexte: BulletinContexte | null;

  bulletin: Bulletin | null = null;
  loading = false;
  downloading = false;
  publishing = false;

  constructor() {
    this.bulletinId = lireBulletinIdDepuisState(this.router);
    this.contexte = lireContexteDepuisState(this.router);
  }

  ngOnInit(): void {
    if (this.bulletinId === null) {
      this.notificationService.info('Sélectionnez un bulletin dans la liste.');
      this.retourListe();
      return;
    }

    this.charger();
  }

  private charger(): void {
    if (this.bulletinId === null) return;

    this.loading = true;
    this.bulletinService.getById(this.bulletinId).subscribe({
      next: (bulletin) => {
        this.loading = false;
        this.bulletin = bulletin;

        if (!bulletin) {
          this.notificationService.error('Bulletin introuvable.');
          this.retourListe();
        }
      },
      error: () => {
        this.loading = false;
        this.notificationService.error('Erreur lors du chargement du bulletin');
        this.retourListe();
      }
    });
  }

  retourListe(): void {
    // Le contexte est renvoye pour que la liste retrouve son filtrage.
    this.router.navigate([ROUTE_BULLETINS(this.router)], {
      state: this.contexte ? { [STATE_BULLETIN_CONTEXTE]: this.contexte } : {}
    });
  }

  // ------------------------------------------------------------------
  // Etat
  // ------------------------------------------------------------------

  get lectureSeule(): boolean {
    return this.authService.isSupervisor();
  }

  get estPublie(): boolean {
    return this.bulletin?.statut === 'PUBLIE';
  }

  /** Les decimaux arrivent en chaine depuis Laravel : on normalise a l'affichage. */
  format(valeur: string | number | null | undefined, decimales = 2): string {
    if (valeur === null || valeur === undefined || valeur === '') return '-';

    const nombre = Number(valeur);
    return Number.isFinite(nombre)
      ? nombre.toLocaleString('fr-FR', {
          minimumFractionDigits: decimales,
          maximumFractionDigits: decimales
        })
      : '-';
  }

  // ------------------------------------------------------------------
  // Actions
  // ------------------------------------------------------------------

  ouvrirConseilClasse(): void {
    if (!this.bulletin) return;

    if (this.estPublie) {
      this.notificationService.info(
        'Ce bulletin est publié : dépubliez-le pour modifier le conseil de classe.'
      );
      return;
    }

    this.dialog
      .open(ConseilClasseDialogComponent, {
        width: '640px',
        disableClose: true,
        data: { bulletin: this.bulletin }
      })
      .afterClosed()
      .subscribe((enregistre) => {
        if (enregistre) this.charger();
      });
  }

  publier(): void {
    if (!this.bulletin || this.publishing) return;

    const data: ConfirmationDialogData = {
      title: 'Publier le bulletin',
      message: `Le bulletin de ${this.bulletin.eleve_prenom} ${this.bulletin.eleve_nom} va être publié. Une fois publié, il est figé : une correction de note ne le modifiera plus.`,
      confirmLabel: 'Publier',
      destructive: false
    };

    this.dialog
      .open(ConfirmatiomModalComponent, { width: '440px', data })
      .afterClosed()
      .subscribe((confirme) => {
        if (!confirme || !this.bulletin) return;

        this.publishing = true;
        this.bulletinService.publierUn(this.bulletin.id).subscribe({
          next: (res) => {
            this.publishing = false;
            this.notificationService.success(res.message);
            this.charger();
          },
          error: (err) => {
            this.publishing = false;
            this.notificationService.error(
              err?.error?.message ?? 'Erreur lors de la publication'
            );
          }
        });
      });
  }

  depublier(): void {
    if (!this.bulletin || this.publishing) return;

    const data: ConfirmationDialogData = {
      title: 'Dépublier le bulletin',
      message: `Ce bulletin repassera en brouillon et pourra être recalculé. L'exemplaire déjà remis à la famille ne correspondra plus à ce qui sera réédité.`,
      confirmLabel: 'Dépublier',
      destructive: true
    };

    this.dialog
      .open(ConfirmatiomModalComponent, { width: '440px', data })
      .afterClosed()
      .subscribe((confirme) => {
        if (!confirme || !this.bulletin) return;

        this.publishing = true;
        this.bulletinService.depublierUn(this.bulletin.id).subscribe({
          next: (res) => {
            this.publishing = false;
            this.notificationService.success(res.message);
            this.charger();
          },
          error: (err) => {
            this.publishing = false;
            this.notificationService.error(
              err?.error?.message ?? 'Erreur lors de la dépublication'
            );
          }
        });
      });
  }

  telechargerPdf(): void {
    if (!this.bulletin || this.downloading) return;

    this.downloading = true;
    this.bulletinService.downloadPdf(this.bulletin.id).subscribe({
      next: (blob) => {
        this.downloading = false;
        const url = window.URL.createObjectURL(blob);
        const lien = document.createElement('a');
        lien.href = url;
        lien.download = `bulletin-${this.bulletin?.eleve_prenom}-${this.bulletin?.eleve_nom}.pdf`;
        lien.click();
        window.URL.revokeObjectURL(url);
      },
      error: () => {
        this.downloading = false;
        this.notificationService.error('Erreur lors de la génération du PDF');
      }
    });
  }
}
