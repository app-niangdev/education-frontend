import { CommonModule } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatMenuModule } from '@angular/material/menu';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { fadeInRight400ms } from '@vex/animations/fade-in-right.animation';
import { scaleIn400ms } from '@vex/animations/scale-in.animation';
import { stagger40ms } from '@vex/animations/stagger.animation';
import { FraisScolaireService } from 'src/app/auth/services/frais-scolaire.service';
import { NiveauService } from 'src/app/auth/services/niveau.service';
import { NotificationService } from 'src/app/auth/services/Notification.service';
import {
  ConfirmationDialogData,
  ConfirmatiomModalComponent
} from 'src/app/features/confirmatiom-modal/confirmatiom-modal.component';
import { Niveau } from 'src/app/interfaces/Niveau';
import { ListeLigneComponent } from 'src/app/shared/liste/liste-ligne.component';
import { ListePageComponent } from 'src/app/shared/liste/liste-page.component';
import { NiveauxAddEditComponent } from '../niveaux-add-edit/niveaux-add-edit.component';

/**
 * Interface unifiée Niveaux & frais scolaires : chaque niveau s'affiche avec
 * son barème de l'année en cours, et les deux se créent d'un seul geste.
 *
 * Seule l'année en cours se pilote ici — les barèmes des années passées restent
 * en base pour l'historique de facturation, mais sont figés.
 */
@Component({
  selector: 'vex-niveaux-list',
  templateUrl: './niveaux-list.component.html',
  styleUrls: ['./niveaux-list.component.scss'],
  animations: [stagger40ms, scaleIn400ms, fadeInRight400ms],
  standalone: true,
  imports: [
    CommonModule,
    MatIconModule,
    MatButtonModule,
    MatMenuModule,
    MatTooltipModule,
    MatProgressSpinnerModule,
    MatFormFieldModule,
    MatInputModule,
    MatDialogModule,
    ListePageComponent,
    ListeLigneComponent
  ]
})
export class NiveauxListComponent implements OnInit {
  private readonly niveauService = inject(NiveauService);
  private readonly fraisService = inject(FraisScolaireService);
  private readonly notificationService = inject(NotificationService);
  private readonly dialog = inject(MatDialog);

  readonly niveaux = this.niveauService.niveaux;

  /** Année tarifée ; nulle si aucune n'est en cours. */
  readonly annee = this.niveauService.annee;

  /**
   * La grille tient sur un écran (une école a quelques dizaines de niveaux au
   * plus) : le filtrage se fait côté client, sans aller-retour serveur.
   */
  readonly recherche = signal('');

  readonly niveauxFiltres = computed(() => {
    const terme = this.recherche().trim().toLowerCase();
    if (!terme) return this.niveaux();

    return this.niveaux().filter(
      (n) =>
        n.nom.toLowerCase().includes(terme) ||
        n.code.toLowerCase().includes(terme) ||
        (n.cycle_libelle ?? n.cycle).toLowerCase().includes(terme)
    );
  });

  /** Un niveau sans barème bloque les inscriptions : on le signale. */
  readonly niveauxSansTarif = computed(
    () => this.niveaux().filter((n) => !n.frais_scolaire).length
  );

  loading = false;
  generating = false;

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.loading = true;
    this.niveauService.getGrille().subscribe({
      next: () => (this.loading = false),
      error: () => {
        this.loading = false;
        this.notificationService.error('Erreur lors du chargement des niveaux');
      }
    });
  }

  onRecherche(valeur: string): void {
    this.recherche.set(valeur);
  }

  openAddDialog(): void {
    this.dialog
      .open(NiveauxAddEditComponent, {
        width: '640px',
        maxHeight: '90vh',
        disableClose: true,
        data: { isEdit: false, annee: this.annee() }
      })
      .afterClosed()
      .subscribe((created) => {
        if (created) this.loadData();
      });
  }

  editNiveau(niveau: Niveau): void {
    this.dialog
      .open(NiveauxAddEditComponent, {
        width: '640px',
        maxHeight: '90vh',
        disableClose: true,
        data: { isEdit: true, niveau, annee: this.annee() }
      })
      .afterClosed()
      .subscribe((updated) => {
        if (updated) this.loadData();
      });
  }

  deleteNiveau(niveau: Niveau): void {
    const data: ConfirmationDialogData = {
      title: 'Supprimer le niveau',
      message: `Voulez-vous vraiment supprimer le niveau « ${niveau.nom} » ainsi que ses frais scolaires ? Cette action est irréversible.`,
      confirmLabel: 'Supprimer',
      destructive: true
    };

    this.dialog
      .open(ConfirmatiomModalComponent, { width: '460px', data })
      .afterClosed()
      .subscribe((confirmed) => {
        if (!confirmed) return;

        this.niveauService.delete(niveau.id).subscribe({
          next: (res) => {
            this.notificationService.success(res.message);
            this.loadData();
          },
          error: (err) =>
            this.notificationService.error(
              err?.error?.message ?? 'Erreur lors de la suppression'
            )
        });
      });
  }

  /**
   * Reprend les tarifs de l'année précédente pour les niveaux qui n'en ont pas
   * encore cette année — évite de ressaisir toute la grille à chaque rentrée.
   */
  genererGrille(): void {
    const annee = this.annee();
    if (this.generating || !annee) return;

    const data: ConfirmationDialogData = {
      title: 'Reprendre les tarifs de l’année précédente',
      message: `Définir les frais manquants de l'année « ${annee.nom} » en reprenant ceux de l'année précédente ? Les tarifs déjà saisis ne seront pas modifiés.`,
      confirmLabel: 'Reprendre',
      cancelLabel: 'Annuler'
    };

    this.dialog
      .open(ConfirmatiomModalComponent, { width: '460px', data })
      .afterClosed()
      .subscribe((confirmed) => {
        if (!confirmed) return;

        this.generating = true;
        this.fraisService.genererGrille(annee.id).subscribe({
          next: (res) => {
            this.generating = false;
            this.notificationService.success(res.message);
            this.loadData();
          },
          error: (err) => {
            this.generating = false;
            this.notificationService.error(
              err?.error?.message ?? 'Erreur lors de la reprise des tarifs'
            );
          }
        });
      });
  }

  formatMontant(montant: number): string {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'XOF',
      maximumFractionDigits: 0
    }).format(montant);
  }
}
