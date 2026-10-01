import { CommonModule } from '@angular/common';
import { Component, Inject, inject } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators
} from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef
} from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';

export interface DepenseRefusDialogData {
  libelle: string;
  montant: string;
}

/**
 * Le refus d'une dépense, avec son motif.
 *
 * Le motif est obligatoire — le serveur le refuse en dessous de 5 caractères :
 * c'est la seule chose qui permette au trésorier de comprendre ce qui a été
 * écarté et de corriger sa saisie. Un refus muet laisserait la dépense bloquée
 * sans recours.
 */
@Component({
  selector: 'vex-depense-refus-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule
  ],
  template: `
    <h2 mat-dialog-title class="flex items-center gap-2">
      <mat-icon svgIcon="mat:cancel" class="text-warn"></mat-icon>
      Refuser la dépense
    </h2>

    <mat-dialog-content>
      <p class="body-2 text-hint mt-0">
        « {{ data.libelle }} » — <strong>{{ data.montant }}</strong>
      </p>

      <form [formGroup]="form">
        <mat-form-field appearance="outline" class="w-full">
          <mat-label>Motif du refus</mat-label>
          <textarea
            matInput
            formControlName="motif"
            rows="3"
            placeholder="Ex. : justificatif manquant, montant à revoir…"
          ></textarea>
          <mat-hint>Le trésorier verra ce motif sur la fiche.</mat-hint>
          <mat-error *ngIf="form.get('motif')?.hasError('required')">
            Le motif est obligatoire
          </mat-error>
          <mat-error *ngIf="form.get('motif')?.hasError('minlength')">
            Le motif doit être un peu plus explicite (5 caractères au minimum)
          </mat-error>
        </mat-form-field>
      </form>
    </mat-dialog-content>

    <mat-dialog-actions align="end">
      <button mat-button type="button" (click)="annuler()">Annuler</button>
      <button
        mat-flat-button
        color="warn"
        type="button"
        [disabled]="form.invalid"
        (click)="confirmer()"
      >
        Refuser
      </button>
    </mat-dialog-actions>
  `
})
export class DepenseRefusDialogComponent {
  private readonly fb = inject(FormBuilder);
  private readonly dialogRef =
    inject<MatDialogRef<DepenseRefusDialogComponent, string | null>>(
      MatDialogRef
    );

  form: FormGroup = this.fb.group({
    // Mêmes bornes que RefuserDepenseRequest côté serveur : l'utilisateur voit
    // l'erreur tout de suite plutôt qu'après un aller-retour en 422.
    motif: [
      '',
      [
        Validators.required,
        Validators.minLength(5),
        Validators.maxLength(2000)
      ]
    ]
  });

  constructor(@Inject(MAT_DIALOG_DATA) public data: DepenseRefusDialogData) {}

  confirmer(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.dialogRef.close((this.form.value.motif ?? '').trim());
  }

  annuler(): void {
    this.dialogRef.close(null);
  }
}
