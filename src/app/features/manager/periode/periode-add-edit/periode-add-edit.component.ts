import { CommonModule } from '@angular/common';
import { Component, Inject, inject, OnInit } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  Validators
} from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import {
  DateAdapter,
  MAT_DATE_FORMATS,
  MAT_DATE_LOCALE,
  MatNativeDateModule,
  NativeDateAdapter
} from '@angular/material/core';
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
import { NotificationService } from 'src/app/auth/services/Notification.service';
import { PeriodeService } from 'src/app/auth/services/periode.service';
import { AnneeScolaire } from 'src/app/interfaces/AnneeScolaire';
import { Periode, TypePeriode } from 'src/app/interfaces/Periode';

/**
 * Reprend les regles du StorePeriodeRequest cote serveur : la fin suit le
 * debut, et la date butoir de saisie des notes ne peut pas preceder le debut
 * de la periode. Valider ici evite un aller-retour pour une erreur evidente ;
 * le serveur reste l'autorite.
 */
function coherenceDatesValidator(
  control: AbstractControl
): ValidationErrors | null {
  const debut = control.get('date_debut')?.value;
  const fin = control.get('date_fin')?.value;
  const saisie = control.get('date_fin_saisie_notes')?.value;

  const erreurs: ValidationErrors = {};

  if (debut && fin && new Date(debut) >= new Date(fin)) {
    erreurs['finAvantDebut'] = true;
  }

  if (debut && saisie && new Date(saisie) < new Date(debut)) {
    erreurs['saisieAvantDebut'] = true;
  }

  return Object.keys(erreurs).length ? erreurs : null;
}

interface DialogData {
  isEdit: boolean;
  anneeId: number;
  annee?: AnneeScolaire;
  periode?: Periode;
  prochainOrdre?: number;
}

@Component({
  selector: 'vex-periode-add-edit',
  templateUrl: './periode-add-edit.component.html',
  styleUrls: ['./periode-add-edit.component.scss'],
  standalone: true,
  providers: [
    {
      provide: DateAdapter,
      useClass: NativeDateAdapter,
      deps: [MAT_DATE_LOCALE]
    },
    {
      provide: MAT_DATE_FORMATS,
      useValue: {
        parse: { dateInput: null },
        display: {
          dateInput: { year: 'numeric', month: 'short', day: 'numeric' },
          monthYearLabel: { year: 'numeric', month: 'short' },
          dateA11yLabel: { year: 'numeric', month: 'long', day: 'numeric' },
          monthYearA11yLabel: { year: 'numeric', month: 'long' }
        }
      }
    }
  ],
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
export class PeriodeAddEditComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly dialogRef = inject(MatDialogRef<PeriodeAddEditComponent>);
  private readonly periodeService = inject(PeriodeService);
  private readonly notificationService = inject(NotificationService);

  loading = false;

  readonly types: { value: TypePeriode; label: string }[] = [
    { value: 'SEMESTRE', label: 'Semestre' },
    { value: 'TRIMESTRE', label: 'Trimestre' },
    { value: 'BIMESTRE', label: 'Bimestre' },
    { value: 'QUADRIMESTRE', label: 'Quadrimestre' }
  ];

  form: FormGroup = this.fb.group(
    {
      libelle: ['', [Validators.required, Validators.maxLength(100)]],
      type: ['SEMESTRE' as TypePeriode, [Validators.required]],
      ordre: [1, [Validators.required, Validators.min(1)]],
      date_debut: ['', [Validators.required]],
      date_fin: ['', [Validators.required]],
      date_fin_saisie_notes: ['', [Validators.required]]
    },
    { validators: coherenceDatesValidator }
  );

  constructor(@Inject(MAT_DIALOG_DATA) public data: DialogData) {}

  ngOnInit(): void {
    if (this.data.isEdit && this.data.periode) {
      const p = this.data.periode;
      this.form.patchValue({
        libelle: p.libelle,
        type: p.type,
        ordre: p.ordre,
        date_debut: p.date_debut,
        date_fin: p.date_fin,
        date_fin_saisie_notes: p.date_fin_saisie_notes
      });
      return;
    }

    this.form.patchValue({ ordre: this.data.prochainOrdre ?? 1 });
  }

  /**
   * Les dates de la periode restent dans celles de l'annee scolaire : borner
   * le datepicker evite la saisie d'une periode hors de son annee.
   */
  get minDate(): Date | null {
    return this.data.annee ? new Date(this.data.annee.date_debut) : null;
  }

  get maxDate(): Date | null {
    return this.data.annee ? new Date(this.data.annee.date_fin) : null;
  }

  get finAvantDebutError(): boolean {
    return (
      !!this.form.errors?.['finAvantDebut'] &&
      (!!this.form.get('date_debut')?.touched ||
        !!this.form.get('date_fin')?.touched)
    );
  }

  get saisieAvantDebutError(): boolean {
    return (
      !!this.form.errors?.['saisieAvantDebut'] &&
      !!this.form.get('date_fin_saisie_notes')?.touched
    );
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading = true;

    const brut = this.form.value;
    const payload = {
      libelle: brut.libelle,
      type: brut.type,
      ordre: brut.ordre,
      // Le serveur attend des dates ; on normalise en AAAA-MM-JJ pour ne pas
      // envoyer un ISO avec fuseau, qui decalerait le jour.
      date_debut: this.toDateString(brut.date_debut),
      date_fin: this.toDateString(brut.date_fin),
      date_fin_saisie_notes: this.toDateString(brut.date_fin_saisie_notes),
      annee_scolaire_id: this.data.anneeId
    };

    const requete =
      this.data.isEdit && this.data.periode
        ? this.periodeService.update(this.data.periode.id, payload)
        : this.periodeService.create(payload);

    requete.subscribe({
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

  private toDateString(valeur: string | Date): string {
    const d = valeur instanceof Date ? valeur : new Date(valeur);
    const mois = `${d.getMonth() + 1}`.padStart(2, '0');
    const jour = `${d.getDate()}`.padStart(2, '0');

    return `${d.getFullYear()}-${mois}-${jour}`;
  }
}
