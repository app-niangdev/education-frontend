import { CommonModule, Location } from '@angular/common';
import { Component, inject, OnInit } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Router } from '@angular/router';
import { fadeInRight400ms } from '@vex/animations/fade-in-right.animation';
import { scaleIn400ms } from '@vex/animations/scale-in.animation';
import { stagger40ms } from '@vex/animations/stagger.animation';
import { ClasseMatiereService } from 'src/app/auth/services/classe-matiere.service';
import { AffectationService } from 'src/app/auth/services/affectation.service';
import { NotificationService } from 'src/app/auth/services/Notification.service';
import {
  ConfirmationDialogData,
  ConfirmatiomModalComponent
} from 'src/app/features/confirmatiom-modal/confirmatiom-modal.component';
import { Classe } from 'src/app/interfaces/Classe';
import { ClasseMatiere } from 'src/app/interfaces/ClasseMatiere';
import { ListeLigneComponent } from 'src/app/shared/liste/liste-ligne.component';
import { ListePageComponent } from 'src/app/shared/liste/liste-page.component';
import {
  lireClasseDepuisState,
  ROUTE_CLASSES
} from '../classroom/classe-navigation';
import { ProgrammeMatiereDialogComponent } from './programme-matiere-dialog/programme-matiere-dialog.component';
import { AffectationDialogComponent } from './affectation-dialog/affectation-dialog.component';

/**
 * Programme d'une classe : la liste de ses matieres avec leur coefficient
 * (propre a la classe) et l'enseignant affecte a chacune.
 *
 * La classe est passee par le state du Router depuis la liste des classes.
 * A defaut (rafraichissement de page), on la recharge depuis l'id d'URL.
 */
@Component({
  selector: 'vex-classe-programme',
  templateUrl: './classe-programme.component.html',
  styleUrls: ['./classe-programme.component.scss'],
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
export class ClasseProgrammeComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly location = inject(Location);
  private readonly classeMatiereService = inject(ClasseMatiereService);
  private readonly affectationService = inject(AffectationService);
  private readonly notificationService = inject(NotificationService);
  private readonly dialog = inject(MatDialog);

  /**
   * Lu des le constructeur : getCurrentNavigation() n'est renseigne que
   * pendant la navigation et vaut deja null dans ngOnInit.
   */
  private readonly classeFromState = lireClasseDepuisState(this.router);

  classe?: Classe;
  programme: ClasseMatiere[] = [];
  loading = false;
  reordering = false;

  ngOnInit(): void {
    // Sans state (URL saisie/collee directement), la classe n'est pas
    // identifiable. Un rafraichissement conserve le state (history.state).
    if (!this.classeFromState) {
      this.notificationService.info(
        'Sélectionnez une classe dans la liste pour afficher son programme.'
      );
      this.router.navigate([ROUTE_CLASSES(this.router)]);
      return;
    }

    this.classe = this.classeFromState;
    this.loadProgramme();
  }

  loadProgramme(): void {
    if (!this.classe) return;
    this.loading = true;
    this.classeMatiereService.getByClasse(this.classe.id).subscribe({
      next: (data) => {
        this.programme = data;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this.notificationService.error(
          'Erreur lors du chargement du programme'
        );
      }
    });
  }

  goBack(): void {
    this.location.back();
  }

  /**
   * Remonte ou descend une matiere d'un cran.
   *
   * Cet ordre est celui qu'imprimera le bulletin : le modele papier de
   * l'etablissement suit un ordre pedagogique (Francais, Mathematiques,
   * Sciences...) et non alphabetique.
   *
   * L'echange est applique localement avant l'appel serveur pour que la liste
   * reagisse immediatement ; en cas d'erreur on recharge pour revenir a
   * l'ordre reellement enregistre.
   */
  deplacerMatiere(index: number, direction: -1 | 1): void {
    const cible = index + direction;

    if (!this.classe || this.reordering) return;
    if (cible < 0 || cible >= this.programme.length) return;

    const reordonne = [...this.programme];
    [reordonne[index], reordonne[cible]] = [reordonne[cible], reordonne[index]];
    this.programme = reordonne;

    this.reordering = true;
    this.classeMatiereService
      .reordonner(
        this.classe.id,
        reordonne.map((cm) => cm.id)
      )
      .subscribe({
        next: (res) => {
          this.reordering = false;
          this.programme = res.payload ?? reordonne;
        },
        error: (err) => {
          this.reordering = false;
          this.notificationService.error(
            err?.error?.message ?? "Erreur lors de l'enregistrement de l'ordre"
          );
          this.loadProgramme();
        }
      });
  }

  /** Matieres deja au programme : exclues du selecteur d'ajout. */
  private get matiereIdsUsed(): number[] {
    return this.programme.map((cm) => cm.matiere_id);
  }

  openAddMatiere(): void {
    if (!this.classe) return;
    this.dialog
      .open(ProgrammeMatiereDialogComponent, {
        width: '520px',
        disableClose: true,
        data: {
          isEdit: false,
          classeId: this.classe.id,
          classeNom: this.classe.nom,
          matiereIdsUsed: this.matiereIdsUsed
        }
      })
      .afterClosed()
      .subscribe((changed) => {
        if (changed) this.loadProgramme();
      });
  }

  editCoefficient(cm: ClasseMatiere): void {
    if (!this.classe) return;
    this.dialog
      .open(ProgrammeMatiereDialogComponent, {
        width: '520px',
        disableClose: true,
        data: {
          isEdit: true,
          classeId: this.classe.id,
          classeNom: this.classe.nom,
          classeMatiere: cm
        }
      })
      .afterClosed()
      .subscribe((changed) => {
        if (changed) this.loadProgramme();
      });
  }

  removeMatiere(cm: ClasseMatiere): void {
    const data: ConfirmationDialogData = {
      title: 'Retirer la matière',
      message: `Retirer « ${cm.matiere?.nom} » du programme de la classe « ${this.classe?.nom} » ?`,
      confirmLabel: 'Retirer',
      destructive: true
    };

    this.dialog
      .open(ConfirmatiomModalComponent, { width: '440px', data })
      .afterClosed()
      .subscribe((confirmed) => {
        if (!confirmed) return;
        this.classeMatiereService.delete(cm.id).subscribe({
          next: (res) => {
            this.notificationService.success(res.message);
            this.loadProgramme();
          },
          error: (err) =>
            this.notificationService.error(
              err?.error?.message ?? 'Erreur lors du retrait'
            )
        });
      });
  }

  /** Affecter un enseignant (ou changer celui deja affecte) a la matiere. */
  manageAffectation(cm: ClasseMatiere): void {
    this.dialog
      .open(AffectationDialogComponent, {
        width: '520px',
        disableClose: true,
        data: { classeMatiere: cm, classeNom: this.classe?.nom }
      })
      .afterClosed()
      .subscribe((changed) => {
        if (changed) this.loadProgramme();
      });
  }

  removeAffectation(cm: ClasseMatiere): void {
    if (!cm.affectation) return;
    const nom = `${cm.affectation.enseignant?.user?.first_name ?? ''} ${
      cm.affectation.enseignant?.user?.last_name ?? ''
    }`.trim();

    const data: ConfirmationDialogData = {
      title: "Retirer l'enseignant",
      message: `Retirer l'affectation de « ${nom || 'cet enseignant'} » à « ${cm.matiere?.nom} » ?`,
      confirmLabel: 'Retirer',
      destructive: true
    };

    this.dialog
      .open(ConfirmatiomModalComponent, { width: '440px', data })
      .afterClosed()
      .subscribe((confirmed) => {
        if (!confirmed || !cm.affectation) return;
        this.affectationService.delete(cm.affectation.id).subscribe({
          next: (res) => {
            this.notificationService.success(res.message);
            this.loadProgramme();
          },
          error: (err) =>
            this.notificationService.error(
              err?.error?.message ?? 'Erreur lors du retrait'
            )
        });
      });
  }

  enseignantNom(cm: ClasseMatiere): string | null {
    const user = cm.affectation?.enseignant?.user;
    if (!user) return null;
    return `${user.first_name ?? ''} ${user.last_name ?? ''}`.trim() || null;
  }
}
