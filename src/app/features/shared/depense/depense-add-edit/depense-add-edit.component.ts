import { CommonModule } from '@angular/common';
import { Component, inject, Inject, OnInit } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators
} from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatNativeDateModule } from '@angular/material/core';
import { MatDatepickerModule } from '@angular/material/datepicker';
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
import { DepenseService } from 'src/app/auth/services/depense.service';
import { NotificationService } from 'src/app/auth/services/Notification.service';
import { toApiDate } from 'src/app/features/manager/eleve/eleve-form.utils';
import { Depense, OptionReferentiel } from 'src/app/interfaces/Depense';

interface DialogData {
  isEdit: boolean;
  depense?: Depense;
  categories: OptionReferentiel[];
  modesPaiement: OptionReferentiel[];
}

@Component({
  selector: 'vex-depense-add-edit',
  templateUrl: './depense-add-edit.component.html',
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
export class DepenseAddEditComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly dialogRef = inject(MatDialogRef<DepenseAddEditComponent>);
  private readonly depenseService = inject(DepenseService);
  private readonly notificationService = inject(NotificationService);

  loading = false;

  /** Bornée à aujourd'hui : une dépense ne se saisit pas dans le futur. */
  readonly aujourdhui = new Date();

  form: FormGroup = this.fb.group({
    libelle: ['', [Validators.required, Validators.maxLength(255)]],
    categorie: [null, [Validators.required]],
    montant: [null, [Validators.required, Validators.min(1)]],
    mode_paiement: [null, [Validators.required]],
    date_depense: [new Date() as Date | null, [Validators.required]],
    beneficiaire: [''],
    reference: [''],
    description: ['']
  });

  constructor(@Inject(MAT_DIALOG_DATA) public data: DialogData) {}

  ngOnInit(): void {
    if (this.data.isEdit && this.data.depense) {
      const d = this.data.depense;
      this.form.patchValue({
        libelle: d.libelle,
        categorie: d.categorie,
        montant: d.montant,
        mode_paiement: d.mode_paiement,
        date_depense: d.date_depense ? new Date(d.date_depense) : null,
        beneficiaire: d.beneficiaire ?? '',
        reference: d.reference ?? '',
        description: d.description ?? ''
      });
    }
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const v = this.form.value;
    const dateDepense = toApiDate(v.date_depense);

    // Le champ est requis et borné à aujourd'hui : toApiDate ne rend null que
    // sur une date invalide, qu'on refuse ici plutôt que d'envoyer un trou.
    if (!dateDepense) {
      this.notificationService.error('La date de la dépense est invalide.');
      return;
    }

    this.loading = true;

    const payload = {
      libelle: v.libelle.trim(),
      categorie: v.categorie,
      montant: Number(v.montant),
      mode_paiement: v.mode_paiement,
      date_depense: dateDepense,
      beneficiaire: v.beneficiaire?.trim() || null,
      reference: v.reference?.trim() || null,
      description: v.description?.trim() || null
    };

    const request$ =
      this.data.isEdit && this.data.depense
        ? this.depenseService.update(this.data.depense.id, payload)
        : this.depenseService.create(payload);

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
