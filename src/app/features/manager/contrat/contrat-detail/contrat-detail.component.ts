import { CommonModule } from '@angular/common';
import { Component, Inject, OnInit, inject } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef
} from '@angular/material/dialog';
import { MatDividerModule } from '@angular/material/divider';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ContratService } from 'src/app/auth/services/contrat.service';
import { NotificationService } from 'src/app/auth/services/Notification.service';
import { Contrat, TypePersonnel } from 'src/app/interfaces/Contrat';
import {
  ContratFormComponent,
  creerGroupeContrat,
  nettoyerContrat
} from 'src/app/shared/contrat-form/contrat-form.component';

interface DialogData {
  contratId: number;
}

/**
 * La fiche d'un contrat : ses conditions, et tout l'historique contractuel de
 * l'employé.
 *
 * Un contrat en cours peut y être corrigé ; un contrat clos est en lecture
 * seule, puisque rouvrir ses conditions réécrirait l'histoire de la relation
 * de travail.
 */
@Component({
  selector: 'vex-contrat-detail',
  templateUrl: './contrat-detail.component.html',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatDialogModule,
    MatIconModule,
    MatDividerModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    ContratFormComponent
  ]
})
export class ContratDetailComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly dialogRef = inject(MatDialogRef<ContratDetailComponent>);
  private readonly contratService = inject(ContratService);
  private readonly notificationService = inject(NotificationService);

  loading = true;
  saving = false;
  downloading = false;

  /** Bascule lecture / édition : la fiche s'ouvre toujours en lecture. */
  edition = false;

  contrat: Contrat | null = null;
  historique: Contrat[] = [];

  form: FormGroup = creerGroupeContrat(this.fb);

  constructor(@Inject(MAT_DIALOG_DATA) public data: DialogData) {}

  ngOnInit(): void {
    this.contratService.getById(this.data.contratId).subscribe({
      next: (contrat) => {
        this.contrat = contrat;
        this.loading = false;

        if (contrat) {
          this.remplirFormulaire(contrat);
          this.chargerHistorique(contrat);
        }
      },
      error: () => {
        this.loading = false;
        this.notificationService.error('Erreur lors du chargement du contrat');
      }
    });
  }

  /** Un contrat clos ne se modifie plus : seul le renouvellement prend le relais. */
  get estClos(): boolean {
    return this.contrat?.statut === 'EXPIRE' || this.contrat?.statut === 'RESILIE';
  }

  get employe(): string {
    const user = this.contrat?.contractable?.user;

    return `${user?.first_name ?? ''} ${user?.last_name ?? ''}`.trim() || '—';
  }

  basculerEdition(): void {
    this.edition = !this.edition;

    // Repartir des valeurs enregistrées : annuler une édition ne doit pas
    // laisser de saisie en suspens dans le formulaire.
    if (!this.edition && this.contrat) {
      this.remplirFormulaire(this.contrat);
    }
  }

  enregistrer(): void {
    if (this.form.invalid || !this.contrat) {
      this.form.markAllAsTouched();
      return;
    }

    this.saving = true;

    this.contratService
      .update(this.contrat.id, nettoyerContrat(this.form.value))
      .subscribe({
        next: (res) => {
          this.saving = false;
          this.edition = false;
          this.contrat = res.payload ?? this.contrat;
          this.notificationService.success(res.message);
        },
        error: (err) => {
          this.saving = false;
          this.notificationService.error(
            err?.error?.errors?.date_fin?.[0] ??
              err?.error?.errors?.statut?.[0] ??
              err?.error?.message ??
              'Erreur lors de la modification'
          );
        }
      });
  }

  /** Télécharge le contrat de travail imprimable, QR de vérification inclus. */
  telechargerPdf(): void {
    if (!this.contrat || this.downloading) {
      return;
    }

    this.downloading = true;
    const numero = this.contrat.numero_contrat;

    this.contratService.downloadPdf(this.contrat.id).subscribe({
      next: (blob) => {
        this.downloading = false;
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `contrat-${numero}.pdf`;
        a.click();
        window.URL.revokeObjectURL(url);
      },
      error: () => {
        this.downloading = false;
        this.notificationService.error(
          'Erreur lors de la génération du contrat PDF'
        );
      }
    });
  }

  /** Ferme en signalant au parent s'il doit recharger sa liste. */
  fermer(): void {
    this.dialogRef.close(this.contrat !== null);
  }

  formaterDate(date: string | null): string {
    return date ? new Date(date).toLocaleDateString('fr-FR') : '—';
  }

  libelleStatut(contrat: Contrat): string {
    return contrat.statut_libelle ?? contrat.statut;
  }

  private remplirFormulaire(contrat: Contrat): void {
    this.form.patchValue({
      type_contrat: contrat.type_contrat,
      date_debut: contrat.date_debut,
      date_fin: contrat.date_fin ?? '',
      duree_periode_essai: contrat.duree_periode_essai,
      salaire_base: contrat.salaire_base,
      mode_remuneration: contrat.mode_remuneration,
      fonction: contrat.fonction ?? '',
      lieu_travail: contrat.lieu_travail ?? '',
      volume_horaire_hebdo: contrat.volume_horaire_hebdo,
      observations: contrat.observations ?? ''
    });
  }

  /**
   * L'historique se demande par type de personnel : le back attend un mot-clé
   * (« enseignant »), pas la classe PHP portée par `contractable_type`.
   */
  private chargerHistorique(contrat: Contrat): void {
    const type = this.typePersonnel(contrat.contractable_type);

    if (!type || !contrat.contractable_id) {
      return;
    }

    this.contratService
      .getHistorique(type, contrat.contractable_id)
      .subscribe((contrats) => (this.historique = contrats));
  }

  private typePersonnel(classe: string): TypePersonnel | null {
    if (classe.endsWith('Enseignant')) return 'enseignant';
    if (classe.endsWith('Tresorier')) return 'tresorier';
    if (classe.endsWith('Surveillant')) return 'surveillant';

    return null;
  }
}
