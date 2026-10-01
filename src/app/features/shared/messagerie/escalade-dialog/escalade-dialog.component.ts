import { Component, inject } from '@angular/core';
import {
  FormControl,
  ReactiveFormsModule,
  Validators
} from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { NgIf } from '@angular/common';

/**
 * Demande le motif avant de remonter un dossier à la direction.
 *
 * Le motif n'est pas une formalité : la direction reçoit un dossier qu'elle
 * n'a pas suivi et doit savoir sur quoi le service de premier niveau a buté.
 * Le serveur l'exige aussi (10 caractères minimum) ; la même règle est posée
 * ici pour que l'utilisateur le découvre avant d'envoyer, pas après.
 */
@Component({
  selector: 'vex-escalade-dialog',
  standalone: true,
  imports: [
    MatButtonModule,
    MatDialogModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    NgIf,
    ReactiveFormsModule
  ],
  template: `
    <h2 class="flex items-center gap-2" mat-dialog-title>
      <mat-icon
        class="text-amber-600 dark:text-amber-300"
        svgIcon="mat:arrow_upward"></mat-icon>
      <span>Escalader à la direction</span>
    </h2>

    <mat-dialog-content>
      <p class="text-sm text-gray-600 dark:text-gray-400 mb-4">
        Le dossier quittera votre corbeille pour celle de la direction.
        Indiquez ce qui vous empêche de trancher : c'est ce que la direction
        lira en premier.
      </p>

      <mat-form-field appearance="outline" class="w-full">
        <mat-label>Motif de l'escalade</mat-label>
        <textarea
          [formControl]="motif"
          matInput
          rows="4"
          placeholder="Ex. : demande de dérogation sur les frais, hors de ma compétence."></textarea>
        <mat-error *ngIf="motif.hasError('required')">
          Le motif est obligatoire.
        </mat-error>
        <mat-error *ngIf="motif.hasError('minlength')">
          Le motif doit être explicite (10 caractères au minimum).
        </mat-error>
      </mat-form-field>
    </mat-dialog-content>

    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close type="button">Annuler</button>
      <button
        (click)="valider()"
        [disabled]="motif.invalid"
        color="primary"
        mat-raised-button
        type="button">
        Escalader
      </button>
    </mat-dialog-actions>
  `
})
export class EscaladeDialogComponent {
  private readonly dialogRef = inject(MatDialogRef<EscaladeDialogComponent>);

  readonly motif = new FormControl<string>('', {
    nonNullable: true,
    validators: [Validators.required, Validators.minLength(10)]
  });

  valider(): void {
    if (this.motif.invalid) {
      this.motif.markAsTouched();
      return;
    }

    this.dialogRef.close(this.motif.value.trim());
  }
}
