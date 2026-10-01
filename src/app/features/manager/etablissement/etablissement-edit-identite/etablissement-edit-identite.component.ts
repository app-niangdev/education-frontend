import { NgIf } from '@angular/common';
import { Component, Inject, OnInit } from '@angular/core';
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
import { MatDividerModule } from '@angular/material/divider';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { firstApiError } from 'src/app/auth/services/api-error';
import { EtablissementService } from 'src/app/auth/services/etablissement.service';
import { NotificationService } from 'src/app/auth/services/Notification.service';
import { Etablissement } from 'src/app/interfaces/Etablissement';

@Component({
  selector: 'vex-etablissement-edit-identite',
  templateUrl: './etablissement-edit-identite.component.html',
  styleUrls: ['./etablissement-edit-identite.component.scss'],
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
export class EtablissementEditIdentiteComponent implements OnInit {
  form!: FormGroup;
  etablissement!: Etablissement;
  isSubmitting = false;

  constructor(
    private fb: FormBuilder,
    @Inject(MAT_DIALOG_DATA) public data: Etablissement,
    public dialogRef: MatDialogRef<EtablissementEditIdentiteComponent>,
    private etablissementService: EtablissementService,
    private notificationService: NotificationService
  ) {
    this.etablissement = data;
  }

  /**
   * Les contraintes suivent la base : seuls `nom` et les deux inspections sont
   * NOT NULL. `nom_court`, `slogan` et `adresse` sont nullable — les exiger ici
   * empechait d'enregistrer une modification tant qu'ils n'etaient pas remplis.
   * Les longueurs maximales sont celles des colonnes (nom_court : 100).
   */
  ngOnInit(): void {
    this.form = this.fb.group({
      nom: [
        this.etablissement.nom || '',
        [
          Validators.required,
          Validators.minLength(2),
          Validators.maxLength(255)
        ]
      ],
      nom_court: [
        this.etablissement.nom_court || '',
        [Validators.maxLength(100)]
      ],
      slogan: [this.etablissement.slogan || '', [Validators.maxLength(255)]],
      adresse: [this.etablissement.adresse || '', [Validators.maxLength(255)]],
      inspection_academique: [
        this.etablissement.inspection_academique || '',
        [
          Validators.required,
          Validators.minLength(2),
          Validators.maxLength(255)
        ]
      ],
      inspection_education_formation: [
        this.etablissement.inspection_education_formation || '',
        [
          Validators.required,
          Validators.minLength(2),
          Validators.maxLength(255)
        ]
      ]
    });
  }

  save(): void {
    if (this.form.invalid || this.isSubmitting) {
      this.form.markAllAsTouched();
      return;
    }
    this.isSubmitting = true;

    // On n'envoie que les champs du formulaire : joindre l'établissement complet
    // ferait repartir `logo` (une URL) vers une règle de validation `image` => 422.
    //
    // Les champs facultatifs vidés partent à `null` et non `''` : c'est ainsi
    // qu'on efface réellement la valeur, la colonne étant nullable.
    const payload = Object.fromEntries(
      Object.entries(this.form.value).map(([cle, valeur]) => [
        cle,
        typeof valeur === 'string' && valeur.trim() === '' ? null : valeur
      ])
    );

    this.etablissementService
      .updateInfos(this.etablissement.id, payload)
      .subscribe({
        next: () => {
          this.notificationService.success('Identité mise à jour avec succès');
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
