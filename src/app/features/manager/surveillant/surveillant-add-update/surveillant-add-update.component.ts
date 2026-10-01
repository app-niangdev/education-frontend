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
import { SurveillantService } from 'src/app/auth/services/surveillant.service';
import { NotificationService } from 'src/app/auth/services/Notification.service';
import {
  ContratFormComponent,
  creerGroupeContrat,
  nettoyerContrat
} from 'src/app/shared/contrat-form/contrat-form.component';
import { Surveillant } from 'src/app/interfaces/Surveillant';

interface DialogData {
  isEdit: boolean;
  surveillant?: Surveillant;
}

@Component({
  selector: 'vex-surveillant-add-update',
  templateUrl: './surveillant-add-update.component.html',
  styleUrls: ['./surveillant-add-update.component.scss'],
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
export class SurveillantAddUpdateComponent implements OnInit {
  private readonly fb                  = inject(FormBuilder);
  private readonly dialogRef           = inject(MatDialogRef<SurveillantAddUpdateComponent>);
  private readonly surveillantService  = inject(SurveillantService);
  private readonly notificationService = inject(NotificationService);

  loading = false;

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
      // Obligatoire à la création : le surveillant se connecte avec son
      // adresse, et c'est par elle que partent son mot de passe provisoire et
      // ses codes de vérification. En édition, `ngOnInit` la rend facultative
      // — des comptes plus anciens n'en ont pas.
      email:      ['', [Validators.required, Validators.email, Validators.maxLength(255)]],
      address:    ['', [Validators.maxLength(255)]]
    }),
    profil: this.fb.group({
      matricule:         [{ value: '', disabled: false }],
      zone_surveillance: ['', [Validators.maxLength(255)]],
      horaire:           ['', [Validators.maxLength(255)]]
    }),
    // Les conditions d'engagement forment le contrat, créé avec le surveillant.
    // Il n'est pas modifiable ici : le module Contrats l'historise et le
    // renouvelle, ce qu'un simple champ de profil ne saurait faire.
    contrat: creerGroupeContrat(this.fb)
  });

  constructor(@Inject(MAT_DIALOG_DATA) public data: DialogData) {}

  ngOnInit(): void {
    if (this.data.isEdit && this.data.surveillant) {
      // L'adresse n'est exigée qu'à la création : imposer ici la règle
      // nouvelle à un compte créé avant elle le rendrait immodifiable, y
      // compris pour corriger un nom ou un téléphone. `optionalEmail` valide
      // le format sans rejeter le champ vide.
      const email = this.form.get('user.email')!;
      email.setValidators([optionalEmail, Validators.maxLength(255)]);
      email.updateValueAndValidity();

      const s = this.data.surveillant;
      this.form.patchValue({
        user: {
          first_name: s.user?.first_name ?? '',
          last_name:  s.user?.last_name  ?? '',
          phone_one:  s.user?.phone_one  ?? '',
          phone_two:  s.user?.phone_two  ?? '',
          email:      s.user?.email      ?? '',
          address:    s.user?.address    ?? ''
        },
        profil: {
          matricule:         s.matricule         ?? '',
          zone_surveillance: s.zone_surveillance ?? '',
          horaire:           s.horaire           ?? ''
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
    // Un email laissé vide vaut « non renseigné », pas chaîne vide : sans
    // cela il partirait en `""` et se heurterait à l'unicité dès le deuxième
    // compte sans adresse. Le cas ne subsiste qu'en édition, la création
    // exigeant désormais une adresse.
    const payload: { user: object; profil: object; contrat?: object } = {
      user: { ...raw.user, email: raw.user.email?.trim() || null },
      profil: profilSansMatricule
    };

    // Le contrat n'accompagne que la création : en édition, le groupe est
    // désactivé et absent de `raw`.
    if (!this.data.isEdit) {
      payload.contrat = nettoyerContrat(raw.contrat);
    }

    if (this.data.isEdit && this.data.surveillant) {
      this.surveillantService.update(this.data.surveillant.id, payload).subscribe({
        next: (res) => {
          this.loading = false;
          this.notificationService.success(res.message);
          this.dialogRef.close(true);
        },
        error: (err) => {
          this.loading = false;
          this.notificationService.error(err?.error?.message ?? 'Erreur lors de la mise à jour');
        }
      });
    } else {
      this.surveillantService.create(payload).subscribe({
        next: (res) => {
          this.loading = false;
          this.notificationService.success(res.message);
          this.dialogRef.close(true);
        },
        error: (err) => {
          this.loading = false;
          this.notificationService.error(err?.error?.message ?? 'Erreur lors de la création');
        }
      });
    }
  }

  onCancel(): void {
    this.dialogRef.close(false);
  }
}
