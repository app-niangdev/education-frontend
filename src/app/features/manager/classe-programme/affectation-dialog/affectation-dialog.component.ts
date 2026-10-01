import { CommonModule } from '@angular/common';
import { Component, Inject, inject, OnInit } from '@angular/core';
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
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { AffectationService } from 'src/app/auth/services/affectation.service';
import { EnseignantService } from 'src/app/auth/services/enseignant.service';
import { NotificationService } from 'src/app/auth/services/Notification.service';
import { ClasseMatiere } from 'src/app/interfaces/ClasseMatiere';
import { Enseignant } from 'src/app/interfaces/Enseignant';

interface DialogData {
  classeMatiere: ClasseMatiere;
  classeNom?: string;
}

/**
 * Affecter un enseignant a un couple (classe x matiere), ou changer celui
 * deja affecte. Un seul enseignant par couple : cote backend, reaffecter
 * remplace l'affectation existante.
 */
@Component({
  selector: 'vex-affectation-dialog',
  templateUrl: './affectation-dialog.component.html',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatSelectModule,
    MatButtonModule,
    MatDialogModule,
    MatIconModule,
    MatProgressSpinnerModule
  ]
})
export class AffectationDialogComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly dialogRef =
    inject<MatDialogRef<AffectationDialogComponent, boolean>>(MatDialogRef);
  private readonly affectationService = inject(AffectationService);
  private readonly enseignantService = inject(EnseignantService);
  private readonly notificationService = inject(NotificationService);

  loading = false;
  loadingRefs = true;

  enseignants: Enseignant[] = [];

  form: FormGroup = this.fb.group({
    enseignant_id: [null as number | null, [Validators.required]]
  });

  constructor(@Inject(MAT_DIALOG_DATA) public data: DialogData) {}

  get isChange(): boolean {
    return !!this.data.classeMatiere.affectation;
  }

  ngOnInit(): void {
    if (this.data.classeMatiere.affectation) {
      this.form.patchValue({
        enseignant_id: this.data.classeMatiere.affectation.enseignant_id
      });
    }

    this.enseignantService.getAll().subscribe({
      next: (enseignants) => {
        this.enseignants = enseignants;
        this.loadingRefs = false;
      },
      error: () => {
        this.loadingRefs = false;
        this.notificationService.error(
          'Erreur lors du chargement des enseignants'
        );
      }
    });
  }

  enseignantLabel(e: Enseignant): string {
    const nom = `${e.user?.first_name ?? ''} ${e.user?.last_name ?? ''}`.trim();
    const specialites = (e.matieres ?? []).map((m) => m.nom).join(', ');

    return specialites ? `${nom} — ${specialites}` : nom || `#${e.id}`;
  }

  get canSubmit(): boolean {
    return !this.loading && !this.loadingRefs && this.form.valid;
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading = true;
    const enseignantId = this.form.value.enseignant_id;
    const affectation = this.data.classeMatiere.affectation;

    const payload = {
      enseignant_id: enseignantId,
      classe_matiere_id: this.data.classeMatiere.id
    };

    const request$ = affectation
      ? this.affectationService.update(affectation.id, payload)
      : this.affectationService.create(payload);

    request$.subscribe({
      next: (res) => {
        this.loading = false;
        this.notificationService.success(res.message);
        this.dialogRef.close(true);
      },
      error: (err) => {
        this.loading = false;
        this.notificationService.error(
          err?.error?.message ?? 'Erreur lors de l\'affectation'
        );
      }
    });
  }

  onCancel(): void {
    this.dialogRef.close(false);
  }
}
