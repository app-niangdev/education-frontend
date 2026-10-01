import { CommonModule } from '@angular/common';
import { Component, Inject, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef
} from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AssiduiteService } from 'src/app/auth/services/assiduite.service';
import { NotificationService } from 'src/app/auth/services/Notification.service';
import { Presence } from 'src/app/interfaces/Assiduite';

export interface JustifierDialogData {
  presence: Presence;
}

/**
 * Justification d'une absence, avec le document eventuel.
 *
 * Les contraintes de fichier sont calees sur celles du serveur : au-dela de
 * 2 Mo, PHP tronquerait la requete avant Laravel et l'utilisateur verrait une
 * erreur incomprehensible plutot qu'un message clair.
 */
@Component({
  selector: 'vex-justifier-dialog',
  templateUrl: './justifier-dialog.component.html',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatCheckboxModule,
    MatProgressSpinnerModule
  ]
})
export class JustifierDialogComponent {
  private readonly fb = inject(FormBuilder);
  private readonly assiduiteService = inject(AssiduiteService);
  private readonly notificationService = inject(NotificationService);
  private readonly dialogRef = inject(MatDialogRef<JustifierDialogComponent>);

  /** Aligne sur `upload_max_filesize` du serveur. */
  private readonly TAILLE_MAX = 2 * 1024 * 1024;
  private readonly TYPES_ACCEPTES = [
    'application/pdf',
    'image/jpeg',
    'image/jpg',
    'image/png'
  ];

  saving = false;
  fichier: File | null = null;
  erreurFichier: string | null = null;

  form = this.fb.group({
    justifie: [true],
    motif: [null as string | null, [Validators.maxLength(500)]]
  });

  constructor(@Inject(MAT_DIALOG_DATA) public data: JustifierDialogData) {
    this.form.patchValue({
      justifie: data.presence.justifie,
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

    return `${this.data.presence.statut_libelle} · ${matiere} · ${date}`;
  }

  get justificatifExistant(): string | null {
    return this.data.presence.justificatif_url ?? null;
  }

  onFichier(event: Event): void {
    const input = event.target as HTMLInputElement;
    const fichier = input.files?.[0] ?? null;

    this.erreurFichier = null;
    this.fichier = null;

    if (!fichier) return;

    if (!this.TYPES_ACCEPTES.includes(fichier.type)) {
      this.erreurFichier = 'Le justificatif doit être un PDF ou une image (JPG, PNG).';
      input.value = '';
      return;
    }

    if (fichier.size > this.TAILLE_MAX) {
      this.erreurFichier = 'Le justificatif ne peut pas dépasser 2 Mo.';
      input.value = '';
      return;
    }

    this.fichier = fichier;
  }

  retirerFichier(): void {
    this.fichier = null;
    this.erreurFichier = null;
  }

  enregistrer(): void {
    if (this.form.invalid || this.saving) return;

    const valeurs = this.form.getRawValue();

    this.saving = true;
    this.assiduiteService
      .justifier(
        this.data.presence.id,
        {
          justifie: !!valeurs.justifie,
          motif: valeurs.motif?.trim() || null
        },
        this.fichier
      )
      .subscribe({
        next: (res) => {
          this.saving = false;
          this.notificationService.success(res.message);
          this.dialogRef.close(true);
        },
        error: (err) => {
          this.saving = false;
          this.notificationService.error(
            err?.error?.message ?? "Erreur lors de l'enregistrement de la justification"
          );
        }
      });
  }
}
