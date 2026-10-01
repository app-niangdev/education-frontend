import { CommonModule } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';
import { fadeInRight400ms } from '@vex/animations/fade-in-right.animation';
import { scaleIn400ms } from '@vex/animations/scale-in.animation';
import { stagger40ms } from '@vex/animations/stagger.animation';
import { AnneeScolaireService } from 'src/app/auth/services/annee-scolaire.service';
import { NotificationService } from 'src/app/auth/services/Notification.service';
import { PeriodeService } from 'src/app/auth/services/periode.service';
import {
  ConfirmationDialogData,
  ConfirmatiomModalComponent
} from 'src/app/features/confirmatiom-modal/confirmatiom-modal.component';
import { Periode, TypePeriode } from 'src/app/interfaces/Periode';
import { ListeLigneComponent } from 'src/app/shared/liste/liste-ligne.component';
import { ListePageComponent } from 'src/app/shared/liste/liste-page.component';
import { PeriodeAddEditComponent } from '../periode-add-edit/periode-add-edit.component';

@Component({
  selector: 'vex-periode-list',
  templateUrl: './periode-list.component.html',
  styleUrls: ['./periode-list.component.scss'],
  animations: [stagger40ms, scaleIn400ms, fadeInRight400ms],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatIconModule,
    MatButtonModule,
    MatMenuModule,
    MatTooltipModule,
    MatProgressSpinnerModule,
    MatFormFieldModule,
    MatSelectModule,
    MatDialogModule,
    ListePageComponent,
    ListeLigneComponent
  ]
})
export class PeriodeListComponent implements OnInit {
  private readonly periodeService = inject(PeriodeService);
  private readonly anneeScolaireService = inject(AnneeScolaireService);
  private readonly notificationService = inject(NotificationService);
  private readonly dialog = inject(MatDialog);

  readonly periodes = this.periodeService.periodes;
  readonly annees = this.anneeScolaireService.anneesScolaires;

  // Une periode n'existe que dans une annee scolaire : la liste est toujours
  // filtree sur une annee, jamais globale.
  readonly anneeId = signal<number | null>(null);
  loading = false;

  ngOnInit(): void {
    this.loadAnnees();
  }

  /**
   * Charge les annees puis selectionne celle en cours (a defaut la premiere).
   * Sans annee selectionnee il n'y a pas de periodes a afficher.
   */
  private loadAnnees(): void {
    this.loading = true;
    this.anneeScolaireService.getList(1, 100).subscribe({
      next: (annees) => {
        const defaut = annees.find((a) => a.en_cours) ?? annees[0];

        if (!defaut) {
          this.loading = false;
          return;
        }

        this.anneeId.set(defaut.id);
        this.loadPeriodes();
      },
      error: () => {
        this.loading = false;
        this.notificationService.error(
          'Erreur lors du chargement des années scolaires'
        );
      }
    });
  }

  loadPeriodes(): void {
    const anneeId = this.anneeId();
    if (!anneeId) return;

    this.loading = true;
    this.periodeService.getByAnnee(anneeId).subscribe({
      next: () => (this.loading = false),
      error: () => {
        this.loading = false;
        this.notificationService.error('Erreur lors du chargement des périodes');
      }
    });
  }

  onAnneeChange(anneeId: number): void {
    this.anneeId.set(anneeId);
    this.loadPeriodes();
  }

  get anneeSelectionnee() {
    return this.annees().find((a) => a.id === this.anneeId());
  }

  openAddDialog(): void {
    const anneeId = this.anneeId();
    if (!anneeId) {
      this.notificationService.warning(
        "Créez d'abord une année scolaire avant d'ajouter des périodes."
      );
      return;
    }

    this.dialog
      .open(PeriodeAddEditComponent, {
        width: '600px',
        disableClose: true,
        data: {
          isEdit: false,
          anneeId,
          annee: this.anneeSelectionnee,
          // L'ordre n'est pas devine par l'utilisateur : on propose la place
          // suivante dans l'annee affichee.
          prochainOrdre: this.periodes().length + 1
        }
      })
      .afterClosed()
      .subscribe((created) => {
        if (created) this.loadPeriodes();
      });
  }

  editPeriode(periode: Periode): void {
    this.dialog
      .open(PeriodeAddEditComponent, {
        width: '600px',
        disableClose: true,
        data: {
          isEdit: true,
          periode,
          anneeId: periode.annee_scolaire_id,
          annee: this.anneeSelectionnee
        }
      })
      .afterClosed()
      .subscribe((updated) => {
        if (updated) this.loadPeriodes();
      });
  }

  deletePeriode(periode: Periode): void {
    const data: ConfirmationDialogData = {
      title: 'Supprimer la période',
      message: `Voulez-vous vraiment supprimer la période « ${periode.libelle} » ? Cette action est irréversible.`,
      confirmLabel: 'Supprimer',
      destructive: true
    };

    this.dialog
      .open(ConfirmatiomModalComponent, { width: '440px', data })
      .afterClosed()
      .subscribe((confirmed) => {
        if (!confirmed) return;

        this.periodeService.delete(periode.id).subscribe({
          next: (res) => {
            this.notificationService.success(res.message);
            this.loadPeriodes();
          },
          error: (err) =>
            this.notificationService.error(
              err?.error?.message ?? 'Erreur lors de la suppression'
            )
        });
      });
  }

  typeLabel(type: TypePeriode): string {
    switch (type) {
      case 'TRIMESTRE':
        return 'Trimestre';
      case 'SEMESTRE':
        return 'Semestre';
      case 'BIMESTRE':
        return 'Bimestre';
      case 'QUADRIMESTRE':
        return 'Quadrimestre';
    }
  }

  formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  }

  /** La saisie des notes est close quand la date butoir est depassee. */
  saisieClose(periode: Periode): boolean {
    return new Date(periode.date_fin_saisie_notes) < new Date();
  }
}
