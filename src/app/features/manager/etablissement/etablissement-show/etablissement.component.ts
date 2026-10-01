import { CommonModule } from '@angular/common';
import { Component, DestroyRef, inject, OnInit } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { fadeInRight400ms } from '@vex/animations/fade-in-right.animation';
import { scaleIn400ms } from '@vex/animations/scale-in.animation';
import { stagger40ms } from '@vex/animations/stagger.animation';
import { firstApiError } from 'src/app/auth/services/api-error';
import { AuthService } from 'src/app/auth/services/auth.service';
import { EtablissementService } from 'src/app/auth/services/etablissement.service';
import { SettingService } from 'src/app/auth/services/setting.service';
import { Etablissement } from 'src/app/interfaces/Etablissement';
import { Setting } from 'src/app/interfaces/Setting';
import { EtablissementEditIdentiteComponent } from '../etablissement-edit-identite/etablissement-edit-identite.component';
import { EtablissementEditContactComponent } from '../etablissement-edit-contact/etablissement-edit-contact.component';
import { EtablissementEditParametrageComponent } from '../etablissement-edit-parametrage/etablissement-edit-parametrage.component';
import { EtablissementCreateComponent } from '../etablissement-create/etablissement-create.component';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { NotificationService } from 'src/app/auth/services/Notification.service';

/**
 * Écran unique « Établissement » : identité, contacts, logo et paramétrage
 * applicatif au même endroit.
 *
 * Le manager accède à tout, sauf au statut de l'établissement et au mode
 * maintenance : ces deux réglages coupent l'accès à la plateforme entière et
 * restent la main de l'admin (le serveur les écarte pour les autres rôles).
 */
@Component({
  selector: 'vex-etablissement',
  templateUrl: './etablissement.component.html',
  styleUrls: ['./etablissement.component.scss'],
  animations: [stagger40ms, scaleIn400ms, fadeInRight400ms],
  standalone: true,
  imports: [
    MatIconModule,
    CommonModule,
    MatButtonModule,
    MatProgressSpinnerModule,
    MatTooltipModule
  ]
})
export class EtablissementComponent implements OnInit {
  private readonly destroyRef = inject(DestroyRef);
  private readonly etablissementService = inject(EtablissementService);
  private readonly settingService = inject(SettingService);
  private readonly notificationService = inject(NotificationService);
  private readonly authService = inject(AuthService);

  etablissement = this.etablissementService.etablissement;
  loading = this.etablissementService.loading;
  loadError = this.etablissementService.error;
  isEmpty = this.etablissementService.empty;

  /** Paramétrage applicatif, présenté avec l'établissement. */
  setting = this.settingService.setting;

  /**
   * Le statut de l'établissement et le mode maintenance ne s'affichent et ne
   * s'éditent que pour l'admin : ils rendent la plateforme inaccessible. Le
   * serveur les écarte de toute façon pour les autres rôles.
   */
  readonly isAdmin = this.authService.getRole() === 'admin';

  readonly logoMaxSize = EtablissementService.LOGO_MAX_SIZE;
  readonly logoAcceptedTypes = EtablissementService.LOGO_ACCEPTED_TYPES;
  readonly logoAccept = 'image/jpeg,image/png,image/jpg,image/svg+xml,image/webp';
  isUploadingLogo = false;

  constructor(private dialog: MatDialog) {}

  ngOnInit(): void {
    this.reload();

    this.settingService
      .getParametrage()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe();
  }

  reload(): void {
    this.etablissementService
      .getInfoEtablissement()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe();
  }

  /** Aucun établissement en base : on ouvre le formulaire de création. */
  createEtablissement(): void {
    this.dialog
      .open(EtablissementCreateComponent, {
        width: '700px',
        maxHeight: '90vh',
        disableClose: true
      })
      .afterClosed()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((created) => {
        if (created) this.reload();
      });
  }

  onLogoSelected(event: Event, etablissement: Etablissement): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    // On réinitialise l'input pour permettre de re-sélectionner le même fichier.
    input.value = '';

    if (!this.logoAcceptedTypes.includes(file.type)) {
      this.notificationService.error(
        'Le logo doit être une image (jpeg, png, jpg, svg ou webp).'
      );
      return;
    }

    if (file.size > this.logoMaxSize) {
      this.notificationService.error('Le logo ne peut pas dépasser 2 Mo.');
      return;
    }

    this.isUploadingLogo = true;
    this.etablissementService
      .updateLogo(etablissement.id, file)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.notificationService.success('Logo mis à jour avec succès');
          this.isUploadingLogo = false;
        },
        error: (error) => {
          this.notificationService.error(
            firstApiError(error, 'Erreur lors de la mise à jour du logo')
          );
          this.isUploadingLogo = false;
        }
      });
  }

  editIdentite(etablissement: Etablissement) {
    this.dialog
      .open(EtablissementEditIdentiteComponent, {
        width: '700px',
        disableClose: true,
        data: etablissement
      })
      .afterClosed()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((updated) => {
        if (updated) this.reload();
      });
  }

  editContacts(etablissement: Etablissement) {
    this.dialog
      .open(EtablissementEditContactComponent, {
        width: '700px',
        disableClose: true,
        data: etablissement
      })
      .afterClosed()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((updated) => {
        if (updated) this.reload();
      });
  }

  /**
   * Le service met déjà son signal à jour depuis la réponse : pas de
   * rechargement ici, contrairement à l'établissement dont le logo transite
   * par une autre requête.
   */
  editParametrage(setting: Setting) {
    this.dialog.open(EtablissementEditParametrageComponent, {
      width: '700px',
      maxHeight: '90vh',
      disableClose: true,
      data: { setting, isAdmin: this.isAdmin }
    });
  }
}
