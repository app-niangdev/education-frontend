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
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatiereService } from 'src/app/auth/services/matiere.service';
import { NotificationService } from 'src/app/auth/services/Notification.service';
import { Matiere } from 'src/app/interfaces/Matiere';

interface DialogData {
  isEdit: boolean;
  matiere?: Matiere;
}

@Component({
  selector: 'vex-matiere-add-update',
  templateUrl: './matiere-add-update.component.html',
  styleUrls: ['./matiere-add-update.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatDialogModule,
    MatIconModule,
    MatProgressSpinnerModule
  ]
})
export class MatiereAddUpdateComponent {
  private readonly fb = inject(FormBuilder);
  private readonly dialogRef =
    inject<MatDialogRef<MatiereAddUpdateComponent, boolean>>(MatDialogRef);
  private readonly matiereService = inject(MatiereService);
  private readonly notificationService = inject(NotificationService);

  loading = false;

  form: FormGroup = this.fb.group({
    nom: ['', [Validators.required, Validators.maxLength(100)]],
    code: ['', [Validators.required, Validators.maxLength(20)]],
    description: ['']
  });

  constructor(@Inject(MAT_DIALOG_DATA) public data: DialogData) {
    if (this.data.isEdit && this.data.matiere) {
      const { nom, code, description } = this.data.matiere;
      this.form.patchValue({ nom, code, description });
    }
  }

  get canSubmit(): boolean {
    return !this.loading && this.form.valid;
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading = true;

    const raw = this.form.value;
    const payload = {
      nom: raw.nom,
      code: raw.code,
      // Le backend valide `nullable` : '' ne doit pas etre envoye.
      description: raw.description || null
    };

    const request$ =
      this.data.isEdit && this.data.matiere
        ? this.matiereService.update(this.data.matiere.id, payload)
        : this.matiereService.create(payload);

    request$.subscribe({
      next: (res) => {
        this.loading = false;
        this.notificationService.success(res.message);
        this.dialogRef.close(true);
      },
      error: (err) => {
        this.loading = false;
        this.notificationService.error(
          err?.error?.message ??
            (this.data.isEdit
              ? 'Erreur lors de la mise à jour'
              : 'Erreur lors de la création')
        );
      }
    });
  }

  onCancel(): void {
    this.dialogRef.close(false);
  }
}
