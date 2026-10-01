import { NgIf } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef
} from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatTooltipModule } from '@angular/material/tooltip';
import { CompteTuteurService } from 'src/app/auth/services/compte-tuteur.service';
import { NotificationService } from 'src/app/auth/services/Notification.service';

export interface CompteTuteurDialogData {
  tuteurId: number;
  nomComplet: string;
  telephone: string;
  email?: string | null;
  /** Vrai si un accès existe déjà : on propose alors la réinitialisation. */
  aDejaUnCompte: boolean;
}

/**
 * Ouvre — ou réinitialise — l'accès de connexion d'un tuteur.
 *
 * Tout l'écran est construit autour d'une contrainte : le mot de passe n'est
 * montré qu'une fois. Il n'est stocké nulle part en clair et aucune route ne
 * permet de le relire. Tant qu'il est affiché, la fermeture demande une
 * confirmation explicite, pour qu'il ne disparaisse pas d'un clic distrait.
 */
@Component({
  selector: 'vex-compte-tuteur-dialog',
  standalone: true,
  imports: [
    MatButtonModule,
    MatDialogModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatTooltipModule,
    NgIf,
    ReactiveFormsModule
  ],
  template: `
    <h2 class="flex items-center gap-2" mat-dialog-title>
      <mat-icon svgIcon="mat:lock"></mat-icon>
      <span>
        {{ data.aDejaUnCompte ? 'Réinitialiser l’accès' : 'Ouvrir un accès' }}
      </span>
    </h2>

    <mat-dialog-content>
      <!-- Avant : ce qu'on s'apprête à faire -->
      <ng-container *ngIf="!motDePasse()">
        <p class="m-0 body-2 mb-4">
          <strong>{{ data.nomComplet }}</strong>
          {{
            data.aDejaUnCompte
              ? ' recevra un nouveau mot de passe. L’ancien cessera immédiatement de fonctionner.'
              : ' pourra se connecter à l’espace tuteur pour échanger avec l’école.'
          }}
        </p>

        <div
          class="flex items-start gap-3 px-4 py-3 rounded bg-primary-600/5 border border-primary-600/20 mb-4">
          <mat-icon
            class="icon-sm text-primary-600 flex-none mt-0.5"
            svgIcon="mat:info"></mat-icon>
          <p class="m-0 caption text-hint">
            Le tuteur se connecte avec son <strong>numéro de téléphone</strong>
            et le mot de passe généré ci-après. Il devra le changer à sa
            première connexion.
          </p>
        </div>

        <mat-form-field *ngIf="!data.aDejaUnCompte" appearance="outline" class="w-full">
          <mat-label>Téléphone (identifiant de connexion)</mat-label>
          <mat-icon class="mr-2 text-hint icon-sm" matPrefix svgIcon="mat:phone"></mat-icon>
          <input [formControl]="telephone" matInput />
          <mat-hint>Repris de la fiche tuteur ; corrigez-le si besoin.</mat-hint>
          <mat-error *ngIf="telephone.hasError('required')">
            Le téléphone est obligatoire : c'est l'identifiant de connexion.
          </mat-error>
        </mat-form-field>
      </ng-container>

      <!-- Après : le mot de passe, montré une seule fois -->
      <ng-container *ngIf="motDePasse() as mdp">
        <div
          class="flex items-start gap-3 px-4 py-3 rounded bg-amber-50 dark:bg-amber-900/20 border border-amber-300 dark:border-amber-700 mb-4">
          <mat-icon
            class="icon-sm text-amber-600 dark:text-amber-300 flex-none mt-0.5"
            svgIcon="mat:warning"></mat-icon>
          <p class="m-0 caption text-amber-800 dark:text-amber-200">
            <strong>Notez-le maintenant.</strong> Ce mot de passe ne sera plus
            jamais affiché. En cas de perte, il faudra en générer un nouveau.
          </p>
        </div>

        <div class="rounded border px-4 py-3 mb-3">
          <p class="m-0 caption text-hint mb-1">Identifiant (téléphone)</p>
          <p class="m-0 body-1 font-medium select-all">{{ identifiantFinal }}</p>
        </div>

        <div class="rounded border px-4 py-3 flex items-center gap-3">
          <div class="flex-1 min-w-0">
            <p class="m-0 caption text-hint mb-1">Mot de passe provisoire</p>
            <p class="m-0 text-xl font-mono font-semibold tracking-wide select-all">
              {{ mdp }}
            </p>
          </div>
          <button
            (click)="copier(mdp)"
            mat-icon-button
            matTooltip="Copier"
            type="button">
            <mat-icon svgIcon="mat:file_copy"></mat-icon>
          </button>
        </div>
      </ng-container>
    </mat-dialog-content>

    <mat-dialog-actions align="end">
      <ng-container *ngIf="!motDePasse()">
        <button mat-button mat-dialog-close type="button">Annuler</button>
        <button
          (click)="valider()"
          [disabled]="enCours()"
          color="primary"
          mat-raised-button
          type="button">
          {{ data.aDejaUnCompte ? 'Réinitialiser' : 'Ouvrir l’accès' }}
        </button>
      </ng-container>

      <button
        (click)="fermer()"
        *ngIf="motDePasse()"
        color="primary"
        mat-raised-button
        type="button">
        J'ai noté le mot de passe
      </button>
    </mat-dialog-actions>
  `
})
export class CompteTuteurDialogComponent {
  readonly data = inject<CompteTuteurDialogData>(MAT_DIALOG_DATA);

  private readonly service = inject(CompteTuteurService);
  private readonly notification = inject(NotificationService);
  private readonly dialogRef =
    inject<MatDialogRef<CompteTuteurDialogComponent>>(MatDialogRef);

  readonly motDePasse = signal<string | null>(null);
  readonly enCours = signal(false);

  /** Le numéro réellement enregistré, connu après la réponse du serveur. */
  identifiantFinal = this.data.telephone;

  readonly telephone = new FormControl<string>(this.data.telephone ?? '', {
    nonNullable: true,
    validators: [Validators.required]
  });

  constructor() {
    // Tant que le mot de passe est à l'écran, une fermeture accidentelle le
    // perdrait sans recours : on désactive la sortie par Échap ou clic dehors.
    this.dialogRef.disableClose = true;
  }

  valider(): void {
    if (!this.data.aDejaUnCompte && this.telephone.invalid) {
      this.telephone.markAsTouched();
      return;
    }

    this.enCours.set(true);

    const appel = this.data.aDejaUnCompte
      ? this.service.reinitialiser(this.data.tuteurId)
      : this.service.creer(this.data.tuteurId, {
          telephone: this.telephone.value.trim()
        });

    appel.subscribe({
      next: (resultat) => {
        this.enCours.set(false);
        this.identifiantFinal = resultat.tuteur.telephone_principal;
        this.motDePasse.set(resultat.mot_de_passe);
      },
      error: (erreur) => {
        this.enCours.set(false);
        this.notification.error(
          erreur?.error?.message ?? "L'accès n'a pas pu être créé."
        );
      }
    });
  }

  copier(mdp: string): void {
    navigator.clipboard?.writeText(mdp).then(
      () => this.notification.success('Mot de passe copié.'),
      () => this.notification.error('Copie impossible : notez-le à la main.')
    );
  }

  /** Ferme en signalant que la fiche doit être rechargée. */
  fermer(): void {
    this.dialogRef.close(true);
  }
}
