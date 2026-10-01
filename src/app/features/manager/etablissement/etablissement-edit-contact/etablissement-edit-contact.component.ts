import { NgIf } from '@angular/common';
import { Component, Inject, OnInit } from '@angular/core';
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
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef
} from '@angular/material/dialog';
import { MatDividerModule } from '@angular/material/divider';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { firstApiError } from 'src/app/auth/services/api-error';
import { EtablissementService } from 'src/app/auth/services/etablissement.service';
import { NotificationService } from 'src/app/auth/services/Notification.service';
import { Etablissement } from 'src/app/interfaces/Etablissement';

/** Le back valide site_web / lien_facebook / lien_instagram avec la règle `url`. */
function urlValidator(control: AbstractControl): ValidationErrors | null {
  const value = (control.value ?? '').toString().trim();
  if (!value) return null;
  return /^https?:\/\/[^\s]+\.[^\s]+$/i.test(value) ? null : { url: true };
}

/**
 * Les champs facultatifs vidés partent à `null` et non `''`.
 *
 * Les colonnes concernées (email, liens sociaux) sont nullable : c'est ainsi
 * qu'on efface réellement une valeur. Les champs NOT NULL, eux, sont `required`
 * dans le formulaire et ne peuvent pas arriver vides ici.
 */
function nullifyEmpty<T extends Record<string, any>>(value: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(value).map(([cle, v]) => [
      cle,
      typeof v === 'string' && v.trim() === '' ? null : v
    ])
  ) as Partial<T>;
}

@Component({
  selector: 'vex-etablissement-edit-contact',
  templateUrl: './etablissement-edit-contact.component.html',
  styleUrls: ['./etablissement-edit-contact.component.scss'],
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    NgIf,
    MatButtonModule,
    MatIconModule,
    MatDividerModule,
    MatFormFieldModule,
    MatInputModule,
    MatProgressSpinnerModule
  ]
})
export class EtablissementEditContactComponent implements OnInit {
  form!: FormGroup;
  etablissement!: Etablissement;
  isSubmitting = false;

  constructor(
    private fb: FormBuilder,
    @Inject(MAT_DIALOG_DATA) public data: Etablissement,
    public dialogRef: MatDialogRef<EtablissementEditContactComponent>,
    private etablissementService: EtablissementService,
    private notificationService: NotificationService
  ) {
    this.etablissement = data;
  }

  /**
   * Les contraintes suivent la base : `telephone_secondaire` et `site_web` sont
   * NOT NULL (les laisser vides faisait echouer la requete en 422 cote serveur),
   * `email` est nullable — l'exiger bloquait la modification des seuls contacts.
   */
  ngOnInit(): void {
    this.form = this.fb.group({
      email: [
        this.etablissement.email || '',
        [Validators.email, Validators.maxLength(255)]
      ],
      telephone_principal: [
        this.etablissement.telephone_principal || '',
        [Validators.required, Validators.maxLength(20)]
      ],
      telephone_secondaire: [
        this.etablissement.telephone_secondaire || '',
        [Validators.required, Validators.maxLength(20)]
      ],
      site_web: [
        this.etablissement.site_web || '',
        [Validators.required, Validators.maxLength(255), urlValidator]
      ],
      lien_facebook: [
        this.etablissement.lien_facebook || '',
        [Validators.maxLength(255), urlValidator]
      ],
      lien_instagram: [
        this.etablissement.lien_instagram || '',
        [Validators.maxLength(255), urlValidator]
      ]
    });
  }

  save(): void {
    if (this.form.invalid || this.isSubmitting) {
      this.form.markAllAsTouched();
      return;
    }
    this.isSubmitting = true;

    // Uniquement les champs du formulaire (pas `logo` : le back le valide comme
    // un fichier image et rejetterait l'URL renvoyée par l'API).
    this.etablissementService
      .updateInfos(this.etablissement.id, nullifyEmpty(this.form.value))
      .subscribe({
        next: () => {
          this.notificationService.success('Contacts mis à jour avec succès');
          this.dialogRef.close(true);
        },
        error: (error) => {
          this.notificationService.error(firstApiError(error));
          this.isSubmitting = false;
        }
      });
  }

  close(): void {
    this.dialogRef.close(false);
  }
}
