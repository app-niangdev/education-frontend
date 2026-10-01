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
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { EvaluationService } from 'src/app/auth/services/evaluation.service';
import { NotificationService } from 'src/app/auth/services/Notification.service';
import { Affectation } from 'src/app/interfaces/ClasseMatiere';
import {
  Evaluation,
  EvaluationPayload,
  TYPES_EVALUATION,
  TypeEvaluation
} from 'src/app/interfaces/Evaluation';
import { Periode } from 'src/app/interfaces/Periode';

interface DialogData {
  isEdit: boolean;
  evaluation?: Evaluation;
  affectations: Affectation[];
  periodes: Periode[];
  /** Barème par défaut de l'établissement (parametrages.bareme_defaut). */
  baremeDefaut: number;
}

/**
 * Création / modification d'une évaluation. L'affectation (classe × matière)
 * n'est choisie qu'à la création : la modifier changerait la classe et donc
 * les élèves concernés. En édition, le champ est verrouillé.
 */
@Component({
  selector: 'vex-evaluation-dialog',
  templateUrl: './evaluation-dialog.component.html',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatButtonModule,
    MatDialogModule,
    MatIconModule,
    MatProgressSpinnerModule
  ]
})
export class EvaluationDialogComponent {
  private readonly fb = inject(FormBuilder);
  private readonly dialogRef =
    inject<MatDialogRef<EvaluationDialogComponent, boolean>>(MatDialogRef);
  private readonly evaluationService = inject(EvaluationService);
  private readonly notificationService = inject(NotificationService);

  readonly types = TYPES_EVALUATION;

  loading = false;

  form: FormGroup = this.fb.group({
    affectation_id: [null as number | null, [Validators.required]],
    periode_id: [null as number | null, [Validators.required]],
    titre: ['', [Validators.required, Validators.maxLength(255)]],
    type: ['DEVOIR_1' as TypeEvaluation, [Validators.required]],
    bareme: [20, [Validators.required, Validators.min(1), Validators.max(100)]],
    date_evaluation: [new Date(), [Validators.required]]
  });

  constructor(@Inject(MAT_DIALOG_DATA) public data: DialogData) {
    // Barème pré-rempli avec la valeur par défaut de l'établissement.
    this.form.patchValue({ bareme: this.data.baremeDefaut });
    if (this.data.isEdit && this.data.evaluation) {
      const e = this.data.evaluation;
      this.form.patchValue({
        affectation_id: e.affectation_id,
        periode_id: e.periode_id,
        titre: e.titre,
        type: e.type,
        bareme: e.bareme,
        date_evaluation: e.date_evaluation
          ? new Date(e.date_evaluation)
          : new Date()
      });
      // L'affectation n'est pas modifiable après coup.
      this.form.get('affectation_id')?.disable();
    }
  }

  affectationLabel(a: Affectation): string {
    const matiere = a.classe_matiere?.matiere?.nom ?? '—';
    const classe = a.classe_matiere?.classe?.nom ?? '—';
    return `${matiere} · ${classe}`;
  }

  /** Le coefficient déduit de la matière dans la classe sélectionnée (lecture seule). */
  get coefficientDeduit(): number | null {
    const id =
      this.form.get('affectation_id')?.value ??
      this.data.evaluation?.affectation_id;
    const aff = this.data.affectations.find((a) => a.id === id);
    return (
      aff?.classe_matiere?.coefficient ??
      this.data.evaluation?.coefficient ??
      null
    );
  }

  get canSubmit(): boolean {
    return !this.loading && this.form.valid;
  }

  /** Formate une Date en 'YYYY-MM-DD' (le backend attend une date simple). */
  private toDateString(value: unknown): string {
    const d = value instanceof Date ? value : new Date(value as string);
    const y = d.getFullYear();
    const m = `${d.getMonth() + 1}`.padStart(2, '0');
    const day = `${d.getDate()}`.padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading = true;
    // getRawValue() inclut les champs désactivés (affectation_id en édition).
    const raw = this.form.getRawValue();

    if (this.data.isEdit && this.data.evaluation) {
      // L'affectation n'est pas renvoyée en modification ; le coefficient est
      // déduit côté backend.
      const payload = {
        periode_id: raw.periode_id,
        titre: raw.titre,
        type: raw.type,
        bareme: raw.bareme,
        date_evaluation: this.toDateString(raw.date_evaluation)
      };
      this.evaluationService
        .update(this.data.evaluation.id, payload)
        .subscribe({
          next: (res) => this.onSuccess(res.message),
          error: (err) => this.onError(err, 'Erreur lors de la mise à jour')
        });
    } else {
      const payload: EvaluationPayload = {
        affectation_id: raw.affectation_id,
        periode_id: raw.periode_id,
        titre: raw.titre,
        type: raw.type,
        bareme: raw.bareme,
        date_evaluation: this.toDateString(raw.date_evaluation)
      };
      this.evaluationService.create(payload).subscribe({
        next: (res) => this.onSuccess(res.message),
        error: (err) => this.onError(err, 'Erreur lors de la création')
      });
    }
  }

  private onSuccess(message: string): void {
    this.loading = false;
    this.notificationService.success(message);
    this.dialogRef.close(true);
  }

  private onError(err: unknown, fallback: string): void {
    this.loading = false;
    const message =
      (err as { error?: { message?: string } })?.error?.message ?? fallback;
    this.notificationService.error(message);
  }

  onCancel(): void {
    this.dialogRef.close(false);
  }
}
