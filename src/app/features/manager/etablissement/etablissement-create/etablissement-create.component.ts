import { NgIf } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  Validators
} from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatDividerModule } from '@angular/material/divider';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { firstApiError } from 'src/app/auth/services/api-error';
import { EtablissementService } from 'src/app/auth/services/etablissement.service';
import { NotificationService } from 'src/app/auth/services/Notification.service';

/** Le back valide site_web / lien_facebook / lien_instagram avec la règle `url`. */
function urlValidator(control: AbstractControl): ValidationErrors | null {
  const value = (control.value ?? '').toString().trim();
  if (!value) return null;
  return /^https?:\/\/[^\s]+\.[^\s]+$/i.test(value) ? null : { url: true };
}

/**
 * Création de l'établissement initial.
 *
 * Contrairement aux dialogues d'édition (identité / contacts séparés), tout est
 * demandé en une fois : les colonnes nom, telephone_principal,
 * telephone_secondaire, site_web et les deux inspections sont NOT NULL en base.
 */
@Component({
  selector: 'vex-etablissement-create',
  templateUrl: './etablissement-create.component.html',
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
export class EtablissementCreateComponent implements OnInit {
  form!: FormGroup;
  isSubmitting = false;

  constructor(
    private fb: FormBuilder,
    public dialogRef: MatDialogRef<EtablissementCreateComponent>,
    private etablissementService: EtablissementService,
    private notificationService: NotificationService
  ) {}

  ngOnInit(): void {
    const texte = [
      Validators.required,
      Validators.minLength(2),
      Validators.maxLength(255)
    ];

    this.form = this.fb.group({
      nom: ['', texte],
      nom_court: ['', [Validators.minLength(2), Validators.maxLength(100)]],
      slogan: ['', [Validators.minLength(2), Validators.maxLength(255)]],
      adresse: ['', [Validators.minLength(2), Validators.maxLength(255)]],
      inspection_academique: ['', texte],
      inspection_education_formation: ['', texte],
      email: ['', [Validators.email, Validators.maxLength(255)]],
      telephone_principal: ['', [Validators.required, Validators.maxLength(20)]],
      telephone_secondaire: [
        '',
        [Validators.required, Validators.maxLength(20)]
      ],
      site_web: [
        '',
        [Validators.required, Validators.maxLength(255), urlValidator]
      ],
      lien_facebook: ['', [Validators.maxLength(255), urlValidator]],
      lien_instagram: ['', [Validators.maxLength(255), urlValidator]]
    });
  }

  save(): void {
    if (this.form.invalid || this.isSubmitting) {
      this.form.markAllAsTouched();
      return;
    }
    this.isSubmitting = true;

    // Les champs facultatifs laissés vides sont omis : le back les valide en
    // `nullable|email` / `nullable|url`, or une chaîne vide échoue à ces règles.
    const payload = Object.fromEntries(
      Object.entries(this.form.value).filter(
        ([, v]) => v !== null && v !== undefined && v.toString().trim() !== ''
      )
    ) as any;

    this.etablissementService.createEtablissement(payload).subscribe({
      next: () => {
        this.notificationService.success('Établissement enregistré avec succès');
        this.dialogRef.close(true);
      },
      error: (error) => {
        this.notificationService.error(
          firstApiError(error, "Erreur lors de l'enregistrement")
        );
        this.isSubmitting = false;
      }
    });
  }

  close(): void {
    this.dialogRef.close(false);
  }
}
