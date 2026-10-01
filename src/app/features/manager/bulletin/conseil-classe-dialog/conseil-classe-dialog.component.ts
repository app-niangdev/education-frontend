import { CommonModule } from '@angular/common';
import { Component, Inject, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef
} from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatRadioModule } from '@angular/material/radio';
import { BulletinService } from 'src/app/auth/services/bulletin.service';
import { NotificationService } from 'src/app/auth/services/Notification.service';
import {
  Bulletin,
  DECISIONS_CONSEIL,
  DISTINCTIONS
} from 'src/app/interfaces/Bulletin';

export interface ConseilClasseDialogData {
  bulletin: Bulletin;
}

/**
 * Les deux blocs de cases a cocher du bulletin papier et les observations
 * libres du conseil des professeurs.
 *
 * Chaque bloc est un choix unique — sur le modele papier une seule case est
 * cochee par colonne — et peut rester vide : un conseil n'est pas tenu de se
 * prononcer, d'ou l'option « Aucune » qui remet la valeur a null.
 */
@Component({
  selector: 'vex-conseil-classe-dialog',
  templateUrl: './conseil-classe-dialog.component.html',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatRadioModule,
    MatProgressSpinnerModule
  ]
})
export class ConseilClasseDialogComponent {
  private readonly fb = inject(FormBuilder);
  private readonly bulletinService = inject(BulletinService);
  private readonly notificationService = inject(NotificationService);
  private readonly dialogRef = inject(MatDialogRef<ConseilClasseDialogComponent>);

  readonly decisions = DECISIONS_CONSEIL;
  readonly distinctions = DISTINCTIONS;

  saving = false;

  form = this.fb.group({
    decision_conseil: [null as string | null],
    distinction: [null as string | null],
    observations: [null as string | null, [Validators.maxLength(2000)]]
  });

  constructor(@Inject(MAT_DIALOG_DATA) public data: ConseilClasseDialogData) {
    this.form.patchValue({
      decision_conseil: data.bulletin.decision_conseil,
      distinction: data.bulletin.distinction,
      observations: data.bulletin.observations
    });
  }

  get eleve(): string {
    return `${this.data.bulletin.eleve_prenom} ${this.data.bulletin.eleve_nom}`;
  }

  get observationsLength(): number {
    return (this.form.value.observations ?? '').length;
  }

  enregistrer(): void {
    if (this.form.invalid || this.saving) return;

    this.saving = true;
    const valeurs = this.form.getRawValue();

    this.bulletinService
      .updateConseil(this.data.bulletin.id, {
        decision_conseil: (valeurs.decision_conseil as never) ?? null,
        distinction: (valeurs.distinction as never) ?? null,
        // Une chaine vide vaut « pas d'observation » : on normalise en null.
        observations: valeurs.observations?.trim() || null
      })
      .subscribe({
        next: (res) => {
          this.saving = false;
          this.notificationService.success(res.message);
          this.dialogRef.close(true);
        },
        error: (err) => {
          this.saving = false;
          this.notificationService.error(
            err?.error?.message ?? "Erreur lors de l'enregistrement du conseil de classe"
          );
        }
      });
  }
}
