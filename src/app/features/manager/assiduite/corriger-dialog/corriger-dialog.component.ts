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
import { AssiduiteService } from 'src/app/auth/services/assiduite.service';
import { NotificationService } from 'src/app/auth/services/Notification.service';
import {
  Presence,
  STATUTS_PRESENCE,
  StatutPresence
} from 'src/app/interfaces/Assiduite';

export interface CorrigerDialogData {
  presence: Presence;
}

/**
 * Correction d'une anomalie par la vie scolaire : un eleve note absent etait
 * en realite en retard, ou l'inverse.
 */
@Component({
  selector: 'vex-corriger-dialog',
  templateUrl: './corriger-dialog.component.html',
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
export class CorrigerDialogComponent {
  private readonly fb = inject(FormBuilder);
  private readonly assiduiteService = inject(AssiduiteService);
  private readonly notificationService = inject(NotificationService);
  private readonly dialogRef = inject(MatDialogRef<CorrigerDialogComponent>);

  readonly statuts = STATUTS_PRESENCE;

  saving = false;

  form = this.fb.group({
    statut: [null as StatutPresence | null, [Validators.required]],
    minutes_retard: [null as number | null, [Validators.min(0), Validators.max(240)]],
    motif: [null as string | null, [Validators.maxLength(500)]]
  });

  constructor(@Inject(MAT_DIALOG_DATA) public data: CorrigerDialogData) {
    this.form.patchValue({
      statut: data.presence.statut,
      minutes_retard: data.presence.minutes_retard,
      motif: data.presence.motif
    });
  }

  get eleve(): string {
    return this.data.presence.eleve?.nom_complet ?? '—';
  }

  get contexte(): string {
    const seance = this.data.presence.seance;
    const matiere = seance?.affectation?.classe_matiere?.matiere?.nom ?? '—';
    const date = seance?.date_seance?.slice(0, 10) ?? '';

    return `${matiere} · ${date}`;
  }

  /** Les minutes n'ont de sens que pour un retard. */
  get estRetard(): boolean {
    return this.form.value.statut === 'RETARD';
  }

  enregistrer(): void {
    if (this.form.invalid || this.saving) return;

    const valeurs = this.form.getRawValue();

    this.saving = true;
    this.assiduiteService
      .corriger(this.data.presence.id, {
        statut: valeurs.statut as StatutPresence,
        minutes_retard: this.estRetard ? valeurs.minutes_retard : null,
        motif: valeurs.motif?.trim() || null
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
            err?.error?.message ?? 'Erreur lors de la correction'
          );
        }
      });
  }
}
