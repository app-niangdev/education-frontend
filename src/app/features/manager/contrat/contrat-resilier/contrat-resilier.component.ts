import { CommonModule } from '@angular/common';
import { Component, Inject, inject } from '@angular/core';
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
import { MatDividerModule } from '@angular/material/divider';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ContratService } from 'src/app/auth/services/contrat.service';
import { NotificationService } from 'src/app/auth/services/Notification.service';
import { Contrat } from 'src/app/interfaces/Contrat';

interface DialogData {
  contrat: Contrat;
}

/**
 * Rupture d'un contrat avant son terme.
 *
 * Le motif est obligatoire : une rupture sans raison consignée laisse le
 * dossier de l'employé inexploitable en cas de litige. Le serveur applique la
 * même exigence.
 */
@Component({
  selector: 'vex-contrat-resilier',
  templateUrl: './contrat-resilier.component.html',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatDialogModule,
    MatIconModule,
    MatDividerModule,
    MatProgressSpinnerModule
  ]
})
export class ContratResilierComponent {
  private readonly fb = inject(FormBuilder);
  private readonly dialogRef = inject(MatDialogRef<ContratResilierComponent>);
  private readonly contratService = inject(ContratService);
  private readonly notificationService = inject(NotificationService);

  loading = false;

  form: FormGroup = this.fb.group({
    date_resiliation: [new Date().toISOString().slice(0, 10), [Validators.required]],
    motif_resiliation: ['', [Validators.required, Validators.minLength(5), Validators.maxLength(2000)]]
  });

  constructor(@Inject(MAT_DIALOG_DATA) public data: DialogData) {}

  f(champ: string): AbstractControl {
    return this.form.get(champ)!;
  }

  get employe(): string {
    const user = this.data.contrat.contractable?.user;

    return `${user?.first_name ?? ''} ${user?.last_name ?? ''}`.trim() || 'ce membre du personnel';
  }

  /** Le début du contrat borne la date de résiliation, côté serveur aussi. */
  get dateDebutMin(): string {
    return this.data.contrat.date_debut;
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading = true;

    this.contratService
      .resilier(this.data.contrat.id, this.form.value)
      .subscribe({
        next: (res) => {
          this.loading = false;
          this.notificationService.success(res.message);
          this.dialogRef.close(true);
        },
        error: (err) => {
          this.loading = false;
          this.notificationService.error(
            // Les règles de cohérence (date antérieure au début, contrat déjà
            // clos) remontent en 422 avec un message explicite.
            err?.error?.errors?.date_resiliation?.[0] ??
              err?.error?.errors?.statut?.[0] ??
              err?.error?.message ??
              'Erreur lors de la résiliation'
          );
        }
      });
  }

  onCancel(): void {
    this.dialogRef.close(false);
  }
}
