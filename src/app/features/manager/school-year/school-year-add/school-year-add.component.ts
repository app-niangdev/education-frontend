import { CommonModule } from '@angular/common';
import { Component, inject, Inject, OnInit } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  Validators
} from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
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
import { AnneeScolaireService } from 'src/app/auth/services/annee-scolaire.service';
import { NotificationService } from 'src/app/auth/services/Notification.service';
import {
  AnneeScolaire,
  AnneeScolaireCreatePayload,
  AnneeScolairePayload,
  StatutAnneeScolaire
} from 'src/app/interfaces/AnneeScolaire';

/**
 * Nombre de mois couverts par une période, en comptant les deux mois extrêmes
 * (inclusif) : ex. 1 sept. → 30 juin = 10 mois (sept, oct, …, juin).
 */
function dureeEnMois(start: Date, end: Date): number {
  return (
    (end.getFullYear() - start.getFullYear()) * 12 +
    (end.getMonth() - start.getMonth()) +
    1
  );
}

function dateRangeValidator(control: AbstractControl): ValidationErrors | null {
  const debut = control.get('date_debut')?.value;
  const fin = control.get('date_fin')?.value;
  if (!debut || !fin) return null;
  const start = new Date(debut);
  const end = new Date(fin);
  if (start >= end) return { dateRange: true };
  if (dureeEnMois(start, end) < 6) return { minDuration: true };
  return null;
}

interface DialogData {
  isEdit: boolean;
  annee?: AnneeScolaire;
  /**
   * Vrai si une annee est deja active. Le serveur n'autorise l'activation a la
   * creation que pour amorcer : passe ce cap, la bascule releve de la cloture.
   */
  existeAnneeActive?: boolean;
}

@Component({
  selector: 'vex-school-year-add',
  templateUrl: './school-year-add.component.html',
  styleUrls: ['./school-year-add.component.scss'],
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
    MatCheckboxModule,
    MatButtonModule,
    MatDialogModule,
    MatIconModule,
    MatProgressSpinnerModule
  ]
})
export class SchoolYearAddComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly dialogRef = inject(MatDialogRef<SchoolYearAddComponent>);
  private readonly anneeScolaireService = inject(AnneeScolaireService);
  private readonly notificationService = inject(NotificationService);

  loading = false;
  minDate = new Date(2020, 0, 1);
  maxDate = new Date(2035, 11, 31);

  // `en_cours` n'est modifiable qu'a la creation, et seulement tant qu'aucune
  // annee n'est active (amorcage). En modification, le serveur l'ignore : la
  // bascule appartient a la cloture d'annee.
  form: FormGroup = this.fb.group(
    {
      nom: ['', [Validators.required]],
      date_debut: ['', [Validators.required]],
      date_fin: ['', [Validators.required]],
      statut: ['AVENIR'],
      en_cours: [false]
    },
    { validators: dateRangeValidator }
  );

  constructor(@Inject(MAT_DIALOG_DATA) public data: DialogData) {}

  /** Etat affiche en lecture seule dans le bandeau du formulaire. */
  get estAnneeActive(): boolean {
    return !!this.data.annee?.en_cours;
  }

  /**
   * La case « definir comme active » n'a de sens qu'a la creation de la
   * premiere annee : ailleurs, le serveur refuserait la demande.
   */
  get peutActiver(): boolean {
    return !this.data.isEdit && !this.data.existeAnneeActive;
  }

  /** Cocher la case fixe le statut a ENCOURS, qui va de pair. */
  onEnCoursChange(): void {
    this.form.patchValue({
      statut: this.form.get('en_cours')?.value ? 'ENCOURS' : 'AVENIR'
    });
  }

  readonly statuts: { value: StatutAnneeScolaire; label: string }[] = [
    { value: 'AVENIR', label: 'À venir' },
    { value: 'ENCOURS', label: 'En cours' },
    { value: 'CLOTURER', label: 'Clôturée' }
  ];

  /** Vrai si le formulaire designe cette annee comme l'annee active. */
  get passeEnCours(): boolean {
    return this.form.get('statut')?.value === 'ENCOURS';
  }

  ngOnInit(): void {
    if (this.data.isEdit && this.data.annee) {
      this.form.patchValue({
        nom: this.data.annee.nom,
        date_debut: this.data.annee.date_debut,
        date_fin: this.data.annee.date_fin,
        statut: this.data.annee.statut
      });
    } else {
      const currentYear = new Date().getFullYear();
      this.form.patchValue({
        date_debut: new Date(currentYear, 8, 1).toISOString(),
        date_fin: new Date(currentYear + 1, 5, 30).toISOString()
      });
      this.updateNomFromDates();
    }
  }

  get dateRangeError(): boolean {
    return (
      !!this.form.errors?.['dateRange'] &&
      (!!this.form.get('date_debut')?.touched ||
        !!this.form.get('date_fin')?.touched)
    );
  }

  get minDurationError(): boolean {
    return (
      !!this.form.errors?.['minDuration'] &&
      (!!this.form.get('date_debut')?.touched ||
        !!this.form.get('date_fin')?.touched)
    );
  }

  getApercu(): string {
    const debut = this.form.get('date_debut')?.value;
    const fin = this.form.get('date_fin')?.value;
    if (!debut || !fin) return '';
    const startYear = new Date(debut).getFullYear();
    const endYear = new Date(fin).getFullYear();
    return startYear === endYear ? `${startYear}` : `${startYear}-${endYear}`;
  }

  getDurationInMonths(): number {
    const debut = this.form.get('date_debut')?.value;
    const fin = this.form.get('date_fin')?.value;
    if (!debut || !fin) return 0;
    return dureeEnMois(new Date(debut), new Date(fin));
  }

  onStartDateChange(): void {
    this.updateNomFromDates();
    const debut = this.form.get('date_debut')?.value;
    if (debut && !this.form.get('date_fin')?.value) {
      const start = new Date(debut);
      this.form.patchValue({
        date_fin: new Date(start.getFullYear() + 1, 5, 30).toISOString()
      });
    }
  }

  onEndDateChange(): void {
    this.updateNomFromDates();
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading = true;

    const { en_cours, ...champs } = this.form.value;

    if (this.data.isEdit && this.data.annee) {
      // En modification `en_cours` n'est jamais envoyee : le serveur l'exclut
      // de UpdateAnneeScolaireRequest.
      const payload = champs as AnneeScolairePayload;

      this.anneeScolaireService.update(this.data.annee.id, payload).subscribe({
        next: (res) => {
          this.loading = false;
          this.notificationService.success(res.message);
          this.dialogRef.close(true);
        },
        error: (err) => {
          this.loading = false;
          this.notificationService.error(
            err?.error?.message ?? 'Erreur lors de la mise à jour'
          );
        }
      });
    } else {
      // A la creation, `en_cours` n'accompagne le payload que si l'activation
      // est ouverte (aucune annee active) : sinon le serveur la refuserait.
      const payload = (
        this.peutActiver ? { ...champs, en_cours } : champs
      ) as AnneeScolaireCreatePayload;

      this.anneeScolaireService.create(payload).subscribe({
        next: (res) => {
          this.loading = false;
          this.notificationService.success(res.message);
          this.dialogRef.close(true);
        },
        error: (err) => {
          this.loading = false;
          this.notificationService.error(
            err?.error?.message ?? 'Erreur lors de la création'
          );
        }
      });
    }
  }

  onCancel(): void {
    this.dialogRef.close(false);
  }

  private updateNomFromDates(): void {
    const debut = this.form.get('date_debut')?.value;
    const fin = this.form.get('date_fin')?.value;
    if (debut && fin) {
      const startYear = new Date(debut).getFullYear();
      const endYear = new Date(fin).getFullYear();
      const nom =
        startYear === endYear ? `${startYear}` : `${startYear}-${endYear}`;
      this.form.patchValue({ nom }, { emitEvent: false });
    }
  }
}
