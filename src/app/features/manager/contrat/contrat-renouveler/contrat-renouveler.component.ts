import { CommonModule } from '@angular/common';
import { Component, Inject, OnInit, inject } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule
} from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef
} from '@angular/material/dialog';
import { MatDividerModule } from '@angular/material/divider';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ContratService } from 'src/app/auth/services/contrat.service';
import { NotificationService } from 'src/app/auth/services/Notification.service';
import { Contrat } from 'src/app/interfaces/Contrat';
import {
  ContratFormComponent,
  creerGroupeContrat,
  nettoyerContrat
} from 'src/app/shared/contrat-form/contrat-form.component';

interface DialogData {
  contrat: Contrat;
}

/**
 * Prolongation d'un engagement par un nouveau contrat.
 *
 * Le formulaire est pré-rempli avec les conditions du contrat précédent, qu'on
 * ne modifie le plus souvent que sur les dates. Le serveur clôt l'ancien et
 * chaîne le nouveau à celui-ci.
 */
@Component({
  selector: 'vex-contrat-renouveler',
  templateUrl: './contrat-renouveler.component.html',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatDialogModule,
    MatIconModule,
    MatDividerModule,
    MatProgressSpinnerModule,
    ContratFormComponent
  ]
})
export class ContratRenouvelerComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly dialogRef = inject(MatDialogRef<ContratRenouvelerComponent>);
  private readonly contratService = inject(ContratService);
  private readonly notificationService = inject(NotificationService);

  loading = false;

  form: FormGroup = creerGroupeContrat(this.fb);

  constructor(@Inject(MAT_DIALOG_DATA) public data: DialogData) {}

  ngOnInit(): void {
    const precedent = this.data.contrat;

    this.form.patchValue({
      type_contrat: precedent.type_contrat,
      // Le nouveau contrat prend la suite du précédent : il démarre au
      // lendemain de son terme, ou aujourd'hui si l'ancien n'en avait pas.
      date_debut: this.lendemainDuTerme(precedent.date_fin),
      date_fin: '',
      salaire_base: precedent.salaire_base,
      mode_remuneration: precedent.mode_remuneration,
      fonction: precedent.fonction ?? '',
      lieu_travail: precedent.lieu_travail ?? '',
      volume_horaire_hebdo: precedent.volume_horaire_hebdo,
      // La période d'essai appartient au premier engagement, pas à sa
      // prolongation : le serveur la remet à zéro de toute façon.
      duree_periode_essai: null,
      observations: ''
    });
  }

  get employe(): string {
    const user = this.data.contrat.contractable?.user;

    return `${user?.first_name ?? ''} ${user?.last_name ?? ''}`.trim() || 'ce membre du personnel';
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading = true;

    this.contratService
      .renouveler(this.data.contrat.id, nettoyerContrat(this.form.value))
      .subscribe({
        next: (res) => {
          this.loading = false;
          this.notificationService.success(res.message);
          this.dialogRef.close(true);
        },
        error: (err) => {
          this.loading = false;
          this.notificationService.error(
            err?.error?.errors?.date_fin?.[0] ??
              err?.error?.message ??
              'Erreur lors du renouvellement'
          );
        }
      });
  }

  onCancel(): void {
    this.dialogRef.close(false);
  }

  private lendemainDuTerme(dateFin: string | null): string {
    const depart = dateFin ? new Date(dateFin) : new Date();

    if (dateFin) {
      depart.setDate(depart.getDate() + 1);
    }

    return depart.toISOString().slice(0, 10);
  }
}
