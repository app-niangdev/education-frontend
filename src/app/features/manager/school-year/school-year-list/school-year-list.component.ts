import { CommonModule } from '@angular/common';
import { Component, DestroyRef, inject, OnInit } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { fadeInRight400ms } from '@vex/animations/fade-in-right.animation';
import { scaleIn400ms } from '@vex/animations/scale-in.animation';
import { stagger40ms } from '@vex/animations/stagger.animation';
import { AnneeScolaireService } from 'src/app/auth/services/annee-scolaire.service';
import { AuthService } from 'src/app/auth/services/auth.service';
import { NotificationService } from 'src/app/auth/services/Notification.service';
import {
  ConfirmationDialogData,
  ConfirmatiomModalComponent
} from 'src/app/features/confirmatiom-modal/confirmatiom-modal.component';
import { AnneeScolaire } from 'src/app/interfaces/AnneeScolaire';
import { ListeLigneComponent } from 'src/app/shared/liste/liste-ligne.component';
import { ListePageComponent } from 'src/app/shared/liste/liste-page.component';
import { SchoolYearAddComponent } from '../school-year-add/school-year-add.component';

@Component({
  selector: 'vex-school-year-list',
  templateUrl: './school-year-list.component.html',
  styleUrls: ['./school-year-list.component.scss'],
  animations: [stagger40ms, scaleIn400ms, fadeInRight400ms],
  standalone: true,
  imports: [
    CommonModule,
    MatIconModule,
    MatButtonModule,
    MatMenuModule,
    MatTooltipModule,
    MatProgressSpinnerModule,
    MatDialogModule,
    ListePageComponent,
    ListeLigneComponent
  ]
})
export class SchoolYearListComponent implements OnInit {
  private readonly destroyRef = inject(DestroyRef);
  private readonly anneeScolaireService = inject(AnneeScolaireService);
  private readonly authService = inject(AuthService);
  private readonly notificationService = inject(NotificationService);
  private readonly dialog = inject(MatDialog);

  anneesScolaires = this.anneeScolaireService.anneesScolaires;
  loading = false;

  // La suppression est reservee a l'admin cote serveur : on masque l'action
  // plutot que de laisser le manager decouvrir un 403.
  readonly isAdmin = this.authService.isAdmin();

  get anneeEnCours(): AnneeScolaire | undefined {
    return this.anneesScolaires().find((a) => a.en_cours);
  }

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.loading = true;
    this.anneeScolaireService.getList().subscribe({
      next: () => {
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this.notificationService.error(
          'Erreur lors du chargement des années scolaires'
        );
      }
    });
  }

  openAddDialog(): void {
    this.dialog
      .open(SchoolYearAddComponent, {
        width: '600px',
        disableClose: true,
        // Sans annee active, le formulaire propose d'activer celle-ci : c'est
        // le seul moment ou l'application peut se doter d'une reference.
        data: { isEdit: false, existeAnneeActive: !!this.anneeEnCours }
      })
      .afterClosed()
      .subscribe((created) => {
        if (created) this.loadData();
      });
  }

  editAnnee(annee: AnneeScolaire): void {
    this.dialog
      .open(SchoolYearAddComponent, {
        width: '600px',
        disableClose: true,
        data: { isEdit: true, annee, existeAnneeActive: !!this.anneeEnCours }
      })
      .afterClosed()
      .subscribe((updated) => {
        if (updated) this.loadData();
      });
  }

  deleteAnnee(annee: AnneeScolaire): void {
    if (annee.en_cours) {
      this.notificationService.warning(
        "Impossible de supprimer l'année scolaire en cours"
      );
      return;
    }

    const data: ConfirmationDialogData = {
      title: "Supprimer l'année scolaire",
      message: `Voulez-vous vraiment supprimer l'année scolaire « ${annee.nom} » ? Cette action est irréversible.`,
      confirmLabel: 'Supprimer',
      destructive: true
    };

    this.dialog
      .open(ConfirmatiomModalComponent, { width: '440px', data })
      .afterClosed()
      .subscribe((confirmed) => {
        if (!confirmed) return;

        this.anneeScolaireService.delete(annee.id).subscribe({
          next: (res) => {
            this.notificationService.success(res.message);
            this.loadData();
          },
          // Le serveur enumere ce qui bloque (periodes, classes, bulletins...) :
          // son message est plus utile qu'un libelle generique.
          error: (err) =>
            this.notificationService.error(
              err?.error?.message ?? 'Erreur lors de la suppression'
            )
        });
      });
  }

  getStatutLabel(annee: AnneeScolaire): string {
    switch (annee.statut) {
      case 'ENCOURS':
        return 'En cours';
      case 'AVENIR':
        return 'À venir';
      case 'CLOTURER':
        return 'Clôturée';
    }
  }

  getStatutClass(annee: AnneeScolaire): string {
    switch (annee.statut) {
      case 'ENCOURS':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'AVENIR':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'CLOTURER':
        return 'bg-gray-100 text-gray-600 border-gray-200';
    }
  }

  formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  }

  getLabel(annee: AnneeScolaire): string {
    const debut = new Date(annee.date_debut).getFullYear();
    const fin = new Date(annee.date_fin).getFullYear();
    return debut === fin ? `${debut}` : `${debut}-${fin}`;
  }

  getProgressPercentage(annee: AnneeScolaire): number {
    const start = new Date(annee.date_debut).getTime();
    const end = new Date(annee.date_fin).getTime();
    const now = Date.now();
    if (now <= start) return 0;
    if (now >= end) return 100;
    return Math.round(((now - start) / (end - start)) * 100);
  }

  getDurationInDays(annee: AnneeScolaire): number {
    const diff =
      new Date(annee.date_fin).getTime() - new Date(annee.date_debut).getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  }
}
