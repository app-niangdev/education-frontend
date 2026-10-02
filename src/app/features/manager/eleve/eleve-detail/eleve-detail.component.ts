import { CommonModule } from '@angular/common';
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
import { AuthService } from 'src/app/auth/services/auth.service';
import { EleveService } from 'src/app/auth/services/eleve.service';
import { NotificationService } from 'src/app/auth/services/Notification.service';
import {
  CompteTuteurDialogComponent,
  CompteTuteurDialogData
} from '../compte-tuteur-dialog/compte-tuteur-dialog.component';
import {
  APTITUDES_SPORTIVES,
  Eleve,
  EleveSection,
  STATUTS_INSCRIPTION
} from 'src/app/interfaces/Eleve';
import { LIENS_PARENTE } from 'src/app/interfaces/Tuteur';
import {
  lireEleveIdDepuisState,
  peutModifierEleve,
  peutSaisirInscription,
  ROUTE_ELEVE_EDITION,
  ROUTE_ELEVES,
  ROUTE_INSCRIPTION_AJOUT,
  STATE_ELEVE_ID
} from '../eleve-navigation';
import {
  EleveSectionEditComponent,
  SectionDialogData
} from '../eleve-section-edit/eleve-section-edit.component';

@Component({
  selector: 'vex-eleve-detail',
  templateUrl: './eleve-detail.component.html',
  styleUrls: ['./eleve-detail.component.scss'],
  animations: [scaleIn400ms, fadeInRight400ms],
  standalone: true,
  imports: [
    CommonModule,
    MatIconModule,
    MatButtonModule,
    MatMenuModule,
    MatDialogModule,
    MatTooltipModule,
    MatProgressSpinnerModule
  ]
})
export class EleveDetailComponent implements OnInit {
  private readonly dialog = inject(MatDialog);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly eleveService = inject(EleveService);
  private readonly notificationService = inject(NotificationService);

  /**
   * Lu des le constructeur : getCurrentNavigation() n'est renseigne que
   * pendant la navigation et vaut deja null dans ngOnInit.
   */
  private readonly eleveId = lireEleveIdDepuisState(this.router);

  eleve?: Eleve;
  loading = true;

  ngOnInit(): void {
    // Sans state (URL saisie ou collee directement), la fiche n'est pas
    // identifiable. Un simple rafraichissement conserve le state.
    if (this.eleveId === null) {
      this.notificationService.info(
        'Sélectionnez un élève dans la liste pour afficher sa fiche.'
      );
      this.retour();
      return;
    }

    this.charger(this.eleveId);
  }

  private charger(id: number): void {
    this.loading = true;

    this.eleveService.getById(id).subscribe({
      next: (eleve) => {
        this.loading = false;

        if (!eleve) {
          this.notificationService.error('Élève introuvable');
          this.retour();
          return;
        }

        this.eleve = eleve;
      },
      error: () => {
        this.loading = false;
        this.notificationService.error('Erreur lors du chargement de la fiche');
        this.retour();
      }
    });
  }

  /** Chaque section s'edite dans une modale courte et n'envoie que son bloc. */
  editer(section: EleveSection): void {
    if (!this.eleve) return;

    const data: SectionDialogData = { section, eleve: this.eleve };

    this.dialog
      .open(EleveSectionEditComponent, {
        width: '760px',
        maxHeight: '90vh',
        disableClose: true,
        data
      })
      .afterClosed()
      .subscribe((modifie) => {
        if (modifie && this.eleve) this.charger(this.eleve.id);
      });
  }

  /**
   * Seuls l'admin et le manager ouvrent un accès : c'est une décision qui
   * engage l'école vis-à-vis d'une famille. Le serveur applique la même règle ;
   * ceci évite d'afficher un bouton qui repartirait en 403.
   */
  get peutGererAcces(): boolean {
    return ['admin', 'manager'].includes(this.authService.getRole());
  }

  /**
   * Le tresorier consulte la fiche sans la modifier : les boutons d'edition
   * lui sont masques, le serveur appliquant de toute facon la meme regle.
   */
  get peutModifier(): boolean {
    return peutModifierEleve(this.authService.getRole(), this.router);
  }

  /**
   * L'inscription appartient au manager et au surveillant. Le tresorier la
   * valide en encaissant, mais n'inscrit pas — le bouton lui est masque, le
   * serveur appliquant de toute facon la meme regle.
   */
  get peutInscrire(): boolean {
    return peutSaisirInscription(this.authService.getRole(), this.router);
  }

  /**
   * Ouvre ou réinitialise l'accès du tuteur.
   *
   * Sans cet accès, la fiche tuteur existe mais la famille ne peut pas se
   * connecter : c'est ici que naît le couple téléphone + mot de passe.
   */
  gererAccesTuteur(): void {
    const tuteur = this.eleve?.tuteur;

    if (!tuteur) return;

    this.dialog
      .open(CompteTuteurDialogComponent, {
        width: '520px',
        maxWidth: '95vw',
        data: {
          tuteurId: tuteur.id,
          nomComplet: `${tuteur.prenom} ${tuteur.nom}`.trim(),
          telephone: tuteur.telephone_principal,
          email: tuteur.email,
          aDejaUnCompte: !!tuteur.user_id
        } as CompteTuteurDialogData
      })
      .afterClosed()
      .subscribe((cree) => {
        // La fiche porte désormais un user_id : on la recharge pour que le
        // bouton et l'état d'accès reflètent la réalité.
        if (cree && this.eleve) this.charger(this.eleve.id);
      });
  }

  modifierFiche(): void {
    if (this.eleve) {
      this.router.navigate([ROUTE_ELEVE_EDITION(this.router)], {
        state: { [STATE_ELEVE_ID]: this.eleve.id }
      });
    }
  }

  /** L'inscription part de l'eleve : on pre-selectionne sa fiche. */
  inscrire(): void {
    if (this.eleve) {
      this.router.navigate([ROUTE_INSCRIPTION_AJOUT(this.router)], {
        state: { [STATE_ELEVE_ID]: this.eleve.id }
      });
    }
  }

  retour(): void {
    this.router.navigate([ROUTE_ELEVES(this.router)]);
  }

  // --- Libelles -----------------------------------------------------------

  get statutLabel(): string {
    return (
      STATUTS_INSCRIPTION.find((s) => s.value === this.eleve?.statut_inscription)
        ?.label ?? '—'
    );
  }

  get aptitudeLabel(): string {
    return (
      APTITUDES_SPORTIVES.find((a) => a.value === this.eleve?.aptitude_sportive)
        ?.label ?? '—'
    );
  }

  get lienParenteLabel(): string {
    const lien = this.eleve?.tuteur?.lien_parente;
    return LIENS_PARENTE.find((l) => l.value === lien)?.label ?? '—';
  }

  get sexeLabel(): string {
    return this.eleve?.sexe === 'M' ? 'Masculin' : 'Féminin';
  }

  /** Signale la fiche medicale des qu'elle contient une information critique. */
  get alerteMedicale(): boolean {
    if (!this.eleve) return false;

    return (
      this.eleve.aptitude_sportive !== 'APTE' ||
      !!this.eleve.allergies ||
      !!this.eleve.maladies_chroniques
    );
  }

  get statutClass(): string {
    switch (this.eleve?.statut_inscription) {
      case 'NOUVEAU':
        return 'bg-green-100 text-green-800';
      case 'REDOUBLANT':
        return 'bg-amber-100 text-amber-800';
      case 'REINSCRIT':
        return 'bg-blue-100 text-blue-800';
      case 'TRANSFERE':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  }

  /** Affiche un tiret plutot qu'une case vide. */
  valeur(value: string | number | null | undefined): string {
    if (value === null || value === undefined || value === '') return '—';
    return `${value}`;
  }

  get pereRenseigne(): boolean {
    return !!(this.eleve?.nom_pere || this.eleve?.prenom_pere);
  }

  get mereRenseignee(): boolean {
    return !!(this.eleve?.nom_mere || this.eleve?.prenom_mere);
  }
}
