import { CommonModule } from '@angular/common';
import { Component, inject, Inject, OnInit } from '@angular/core';
import {
  AbstractControl,
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
import { MatDividerModule } from '@angular/material/divider';
import { MatTooltipModule } from '@angular/material/tooltip';
import { optionalEmail } from 'src/app/core/validators/optional-email.validator';
import { EnseignantService } from 'src/app/auth/services/enseignant.service';
import { MatiereService } from 'src/app/auth/services/matiere.service';
import { NotificationService } from 'src/app/auth/services/Notification.service';
import {
  ContratFormComponent,
  creerGroupeContrat,
  nettoyerContrat
} from 'src/app/shared/contrat-form/contrat-form.component';
import { Enseignant } from 'src/app/interfaces/Enseignant';
import { Matiere } from 'src/app/interfaces/Matiere';

interface DialogData {
  isEdit: boolean;
  enseignant?: Enseignant;
}

@Component({
  selector: 'vex-enseignant-add-update',
  templateUrl: './enseignant-add-update.component.html',
  styleUrls: ['./enseignant-add-update.component.scss'],
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
    MatProgressSpinnerModule,
    MatDividerModule,
    MatTooltipModule,
    ContratFormComponent
  ]
})
export class EnseignantAddUpdateComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly dialogRef = inject(MatDialogRef<EnseignantAddUpdateComponent>);
  private readonly enseignantService = inject(EnseignantService);
  private readonly matiereService = inject(MatiereService);
  private readonly notificationService = inject(NotificationService);

  loading = false;
  generatingMatricule = false;

  /** Référentiel des matières, pour la sélection des spécialités. */
  matieres: Matiere[] = [];
  loadingMatieres = true;

  /** Le groupe « contrat », alimenté par le composant partagé. */
  get contratGroup(): FormGroup {
    return this.form.get('contrat') as FormGroup;
  }

  form: FormGroup = this.fb.group({
    user: this.fb.group({
      first_name: ['', [Validators.required, Validators.maxLength(255)]],
      last_name:  ['', [Validators.required, Validators.maxLength(255)]],
      phone_one:  ['', [Validators.required, Validators.maxLength(20)]],
      phone_two:  ['', [Validators.maxLength(20)]],
      // Obligatoire à la création : l'enseignant se connecte avec son adresse,
      // et c'est par elle que partent son mot de passe provisoire et ses codes
      // de vérification. En édition, `ngOnInit` la rend facultative — des
      // comptes plus anciens n'en ont pas.
      email:      ['', [Validators.required, Validators.email, Validators.maxLength(255)]],
      address:    ['', [Validators.maxLength(255)]]
    }),
    profil: this.fb.group({
      matricule:     [{ value: '', disabled: false }],
      // Matières de spécialité : liste d'ids envoyée telle quelle au back,
      // qui remplace (sync) les spécialités existantes.
      matieres:      [[] as number[]],
      diplomes:      ['']
    }),
    // Les conditions d'engagement forment le contrat, créé avec l'enseignant.
    // Il n'est pas modifiable ici : le module Contrats l'historise et le
    // renouvelle, ce qu'un simple champ de profil ne saurait faire.
    contrat: creerGroupeContrat(this.fb)
  });

  constructor(@Inject(MAT_DIALOG_DATA) public data: DialogData) {}

  ngOnInit(): void {
    this.matiereService.getAll().subscribe({
      next: (matieres) => {
        this.matieres = matieres;
        this.loadingMatieres = false;
      },
      error: () => {
        this.loadingMatieres = false;
        this.notificationService.error(
          'Erreur lors du chargement des matières'
        );
      }
    });

    if (this.data.isEdit && this.data.enseignant) {
      // L'adresse n'est exigée qu'à la création : imposer ici la règle
      // nouvelle à un compte créé avant elle le rendrait immodifiable, y
      // compris pour corriger un nom ou un téléphone. `optionalEmail` valide
      // le format sans rejeter le champ vide.
      const email = this.form.get('user.email')!;
      email.setValidators([optionalEmail, Validators.maxLength(255)]);
      email.updateValueAndValidity();

      const e = this.data.enseignant;
      this.form.patchValue({
        user: {
          first_name: e.user?.first_name ?? '',
          last_name:  e.user?.last_name ?? '',
          phone_one:  e.user?.phone_one ?? '',
          phone_two:  e.user?.phone_two ?? '',
          email:      e.user?.email ?? '',
          address:    e.user?.address ?? ''
        },
        profil: {
          matricule:     e.matricule ?? '',
          matieres:      (e.matieres ?? []).map((m) => m.id),
          diplomes:      e.diplomes ?? ''
        }
      });

      // En édition le contrat n'est pas touché : il se modifie depuis son
      // propre module. Désactiver le groupe l'exclut de la valeur envoyée et
      // neutralise ses validateurs, qui bloqueraient sinon la soumission.
      this.contratGroup.disable();
    }
  }

  f(group: string, field: string): AbstractControl {
    return this.form.get(group)!.get(field)!;
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading = true;
    const raw     = this.form.value;
    const { matricule, ...profilSansMatricule } = raw.profil;

    // Un champ facultatif laissé vide vaut « non renseigné », pas chaîne vide :
    // sans cela l'email partirait en `""` et se heurterait à l'unicité dès le
    // deuxième enseignant sans mail.
    const payload: { user: object; profil: object; contrat?: object } = {
      user: { ...raw.user, email: raw.user.email?.trim() || null },
      profil: profilSansMatricule
    };

    // Le contrat n'accompagne que la création : en édition, le groupe est
    // désactivé et absent de `raw`.
    if (!this.data.isEdit) {
      payload.contrat = nettoyerContrat(raw.contrat);
    }

    if (this.data.isEdit && this.data.enseignant) {
      this.enseignantService.update(this.data.enseignant.id, payload).subscribe({
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
      this.enseignantService.create(payload).subscribe({
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
}
