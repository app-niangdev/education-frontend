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
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { ClasseMatiereService } from 'src/app/auth/services/classe-matiere.service';
import { MatiereService } from 'src/app/auth/services/matiere.service';
import { NotificationService } from 'src/app/auth/services/Notification.service';
import { ClasseMatiere } from 'src/app/interfaces/ClasseMatiere';
import { Matiere } from 'src/app/interfaces/Matiere';

interface DialogData {
  isEdit: boolean;
  classeId: number;
  classeNom: string;
  classeMatiere?: ClasseMatiere;
  matiereIdsUsed?: number[];
}

/**
 * Ajout d'une matiere au programme d'une classe (avec son coefficient), ou
 * edition du coefficient / volume horaire d'une matiere deja au programme.
 * En edition, la matiere n'est plus modifiable (le couple classe/matiere est
 * structurel).
 */
@Component({
  selector: 'vex-programme-matiere-dialog',
  templateUrl: './programme-matiere-dialog.component.html',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatDialogModule,
    MatIconModule,
    MatProgressSpinnerModule
  ]
})
export class ProgrammeMatiereDialogComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly dialogRef =
    inject<MatDialogRef<ProgrammeMatiereDialogComponent, boolean>>(MatDialogRef);
  private readonly classeMatiereService = inject(ClasseMatiereService);
  private readonly matiereService = inject(MatiereService);
  private readonly notificationService = inject(NotificationService);

  loading = false;
  loadingRefs = false;

  /** En creation : les matieres non encore inscrites au programme. */
  matieresDisponibles: Matiere[] = [];

  form: FormGroup = this.fb.group({
    matiere_id: [null as number | null, [Validators.required]],
    coefficient: [
      1,
      [Validators.required, Validators.min(1), Validators.max(20)]
    ],
    volume_horaire: [null as number | null, [Validators.min(1)]]
  });

  constructor(@Inject(MAT_DIALOG_DATA) public data: DialogData) {}

  ngOnInit(): void {
    if (this.data.isEdit && this.data.classeMatiere) {
      const { coefficient, volume_horaire } = this.data.classeMatiere;
      this.form.patchValue({ coefficient, volume_horaire });
      // La matiere n'est pas modifiable en edition.
      this.form.get('matiere_id')?.clearValidators();
      this.form.get('matiere_id')?.updateValueAndValidity();
      return;
    }

    this.loadingRefs = true;
    this.matiereService.getAll().subscribe({
      next: (matieres) => {
        const used = new Set(this.data.matiereIdsUsed ?? []);
        this.matieresDisponibles = matieres.filter((m) => !used.has(m.id));
        this.loadingRefs = false;
      },
      error: () => {
        this.loadingRefs = false;
        this.notificationService.error(
          'Erreur lors du chargement des matières'
        );
      }
    });
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
    const raw = this.form.value;

    const request$ =
      this.data.isEdit && this.data.classeMatiere
        ? this.classeMatiereService.update(this.data.classeMatiere.id, {
            coefficient: raw.coefficient,
            volume_horaire: raw.volume_horaire ?? null
          })
        : this.classeMatiereService.create({
            classe_id: this.data.classeId,
            matiere_id: raw.matiere_id,
            coefficient: raw.coefficient,
            volume_horaire: raw.volume_horaire ?? null
          });

    request$.subscribe({
      next: (res) => {
        this.loading = false;
        this.notificationService.success(res.message);
        this.dialogRef.close(true);
      },
      error: (err) => {
        this.loading = false;
        this.notificationService.error(
          err?.error?.message ?? 'Erreur lors de l\'enregistrement'
        );
      }
    });
  }

  onCancel(): void {
    this.dialogRef.close(false);
  }
}
