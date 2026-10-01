import { CommonModule } from '@angular/common';
import { Component, inject, Inject, OnInit } from '@angular/core';
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
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { NiveauService } from 'src/app/auth/services/niveau.service';
import { NotificationService } from 'src/app/auth/services/Notification.service';
import { AnneeScolaire } from 'src/app/interfaces/AnneeScolaire';
import { Niveau, NiveauPayload } from 'src/app/interfaces/Niveau';

interface DialogData {
  isEdit: boolean;
  niveau?: Niveau;

  /**
   * Année tarifée, résolue par la liste. Nulle si aucune n'est en cours : les
   * montants sont alors masqués, le niveau se crée seul.
   */
  annee: AnneeScolaire | null;
}

/**
 * Formulaire unifié : le niveau et son tarif de l'année en cours se saisissent
 * d'un seul geste. Un niveau sans barème bloque toute inscription, les séparer
 * laissait donc un état inutilisable entre les deux étapes.
 */
@Component({
  selector: 'vex-niveaux-add-edit',
  templateUrl: './niveaux-add-edit.component.html',
  styleUrls: ['./niveaux-add-edit.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatSlideToggleModule,
    MatButtonModule,
    MatDialogModule,
    MatIconModule,
    MatProgressSpinnerModule
  ]
})
export class NiveauxAddEditComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly dialogRef = inject(MatDialogRef<NiveauxAddEditComponent>);
  private readonly niveauService = inject(NiveauService);
  private readonly notificationService = inject(NotificationService);

  loading = false;

  readonly cycles = [
    { value: 'PRESCOLAIRE', label: 'Préscolaire' },
    { value: 'PRIMAIRE', label: 'Primaire' },
    { value: 'COLLEGE', label: 'Collège' },
    { value: 'LYCEE', label: 'Lycée' },
    { value: 'UNIVERSITE', label: 'Université' }
  ];

  form: FormGroup = this.fb.group({
    nom: ['', [Validators.required]],
    code: ['', [Validators.required]],
    cycle: ['', [Validators.required]],

    // Le tarif s'applique à l'année en cours. Les validateurs ne sont posés
    // que s'il y a une année à tarifer (cf. ngOnInit) : sans elle les champs
    // sont masqués et ne doivent pas retenir la soumission.
    montant_inscription: [0],
    montant_mensualite: [0],
    nombre_mensualites: [9],
    neuvieme_mois_inclus: [false]
  });

  constructor(@Inject(MAT_DIALOG_DATA) public data: DialogData) {}

  ngOnInit(): void {
    if (this.data.isEdit && this.data.niveau) {
      const n = this.data.niveau;

      this.form.patchValue({ nom: n.nom, code: n.code, cycle: n.cycle });

      // Le barème peut ne pas exister : niveau saisi avant l'ouverture de
      // l'année scolaire. Les champs partent alors de leurs valeurs par défaut.
      if (n.frais_scolaire) {
        this.form.patchValue({
          montant_inscription: n.frais_scolaire.montant_inscription,
          montant_mensualite: n.frais_scolaire.montant_mensualite,
          nombre_mensualites: n.frais_scolaire.nombre_mensualites,
          neuvieme_mois_inclus: n.frais_scolaire.neuvieme_mois_inclus
        });
      }
    }

    if (this.data.annee) {
      this.activerValidationTarifs();
    }
  }

  /** Les montants ne sont exigés que lorsqu'une année est là pour les porter. */
  private activerValidationTarifs(): void {
    this.form
      .get('montant_inscription')
      ?.setValidators([Validators.required, Validators.min(0)]);
    this.form
      .get('montant_mensualite')
      ?.setValidators([Validators.required, Validators.min(0)]);
    this.form
      .get('nombre_mensualites')
      ?.setValidators([
        Validators.required,
        Validators.min(1),
        Validators.max(12)
      ]);

    this.form.get('montant_inscription')?.updateValueAndValidity();
    this.form.get('montant_mensualite')?.updateValueAndValidity();
    this.form.get('nombre_mensualites')?.updateValueAndValidity();
  }

  /** Aperçu : frais annuel = inscription + mensualité × nombre. */
  get fraisAnnuel(): number {
    const v = this.form.value;
    return (
      Number(v.montant_inscription || 0) +
      Number(v.montant_mensualite || 0) * Number(v.nombre_mensualites || 0)
    );
  }

  formatMontant(montant: number): string {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'XOF',
      maximumFractionDigits: 0
    }).format(montant);
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading = true;

    const v = this.form.value;
    const payload: NiveauPayload = { nom: v.nom, code: v.code, cycle: v.cycle };

    // Sans année en cours, rien à tarifer : on n'envoie aucun montant, le
    // serveur crée alors le niveau seul.
    if (this.data.annee) {
      payload.montant_inscription = Number(v.montant_inscription);
      payload.montant_mensualite = Number(v.montant_mensualite);
      payload.nombre_mensualites = Number(v.nombre_mensualites);
      payload.neuvieme_mois_inclus = !!v.neuvieme_mois_inclus;
    }

    const request$ =
      this.data.isEdit && this.data.niveau
        ? this.niveauService.update(this.data.niveau.id, payload)
        : this.niveauService.create(payload);

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
