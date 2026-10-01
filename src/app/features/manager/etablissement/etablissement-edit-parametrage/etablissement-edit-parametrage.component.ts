import { NgIf } from '@angular/common';
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
import { MatDividerModule } from '@angular/material/divider';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { ColorPickerModule } from 'ngx-color-picker';
import { firstApiError } from 'src/app/auth/services/api-error';
import { NotificationService } from 'src/app/auth/services/Notification.service';
import { SettingService } from 'src/app/auth/services/setting.service';
import { Setting, SettingPayload } from 'src/app/interfaces/Setting';

interface DialogData {
  setting: Setting;

  /** Seul l'admin pilote le statut et le mode maintenance. */
  isAdmin: boolean;
}

/**
 * Paramétrage applicatif, édité depuis la page Établissement.
 *
 * Ouvert au manager, sauf pour le statut de l'établissement et le mode
 * maintenance : ces deux réglages coupent l'accès à la plateforme entière et
 * restent la main de l'admin. Le serveur les écarte de son côté, ce formulaire
 * ne fait que refléter cette règle.
 */
@Component({
  selector: 'vex-etablissement-edit-parametrage',
  templateUrl: './etablissement-edit-parametrage.component.html',
  standalone: true,
  imports: [
    NgIf,
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatDividerModule,
    MatFormFieldModule,
    MatInputModule,
    MatSlideToggleModule,
    MatProgressSpinnerModule,
    ColorPickerModule
  ]
})
export class EtablissementEditParametrageComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly settingService = inject(SettingService);
  private readonly notificationService = inject(NotificationService);
  private readonly dialogRef = inject(
    MatDialogRef<EtablissementEditParametrageComponent>
  );

  form!: FormGroup;
  isSubmitting = false;

  readonly setting: Setting;
  readonly isAdmin: boolean;

  constructor(@Inject(MAT_DIALOG_DATA) data: DialogData) {
    this.setting = data.setting;
    this.isAdmin = data.isAdmin;
  }

  ngOnInit(): void {
    this.form = this.fb.group({
      telephone_transaction: [
        this.setting.telephone_transaction || '',
        [Validators.required, Validators.minLength(9), Validators.maxLength(20)]
      ],
      code_couleur: [
        this.setting.code_couleur || '',
        [
          Validators.required,
          Validators.pattern(/^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/)
        ]
      ],
      // Barème appliqué aux nouvelles évaluations (cf. EvaluationService).
      bareme_defaut: [
        this.setting.bareme_defaut ?? 20,
        [Validators.required, Validators.min(1), Validators.max(100)]
      ]
    });

    // Réservés à l'admin : les contrôles n'existent pas pour le manager, plutôt
    // que d'être désactivés — un contrôle désactivé reste réactivable depuis le
    // navigateur, et sa valeur n'a de toute façon pas à partir.
    if (this.isAdmin) {
      this.form.addControl(
        'en_maintenance',
        this.fb.control(this.setting.en_maintenance ?? false)
      );
      this.form.addControl(
        'statut',
        this.fb.control(this.setting.statut ?? true)
      );
    }
  }

  save(): void {
    if (this.form.invalid || this.isSubmitting) {
      this.form.markAllAsTouched();
      return;
    }

    this.isSubmitting = true;

    const v = this.form.value;
    const payload: SettingPayload = {
      telephone_transaction: v.telephone_transaction,
      code_couleur: v.code_couleur,
      bareme_defaut: Number(v.bareme_defaut)
    };

    // Le manager n'envoie pas ces deux champs : le serveur les écarterait, et
    // les omettre laisse leur valeur inchangée (règles `sometimes`).
    if (this.isAdmin) {
      payload.en_maintenance = !!v.en_maintenance;
      payload.statut = !!v.statut;
    }

    this.settingService.updateParametrage(payload).subscribe({
      next: () => {
        this.notificationService.success('Paramètres mis à jour avec succès');
        this.dialogRef.close(true);
      },
      error: (error) => {
        this.notificationService.error(
          firstApiError(error, 'Erreur lors de la mise à jour')
        );
        this.isSubmitting = false;
      }
    });
  }

  close(): void {
    this.dialogRef.close(false);
  }
}
