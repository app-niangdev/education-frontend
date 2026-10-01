import { CommonModule } from '@angular/common';
import { Component, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Router } from '@angular/router';
import { fadeInRight400ms } from '@vex/animations/fade-in-right.animation';
import { scaleIn400ms } from '@vex/animations/scale-in.animation';
import { AssiduiteService } from 'src/app/auth/services/assiduite.service';
import { NotificationService } from 'src/app/auth/services/Notification.service';
import {
  CreneauDuJour,
  LigneAppel,
  LigneAppelInput,
  STATUTS_PRESENCE,
  StatutPresence
} from 'src/app/interfaces/Assiduite';
import { lireAppelDepuisState, ROUTE_MES_CRENEAUX } from '../assiduite-navigation';

/**
 * La feuille d'appel d'un creneau.
 *
 * Tous les eleves sont presents par defaut : on ne saisit que les anomalies,
 * ce qui correspond au geste reel de l'enseignant qui parcourt sa liste et
 * ne s'arrete que sur les absents.
 */
@Component({
  selector: 'vex-feuille-appel',
  templateUrl: './feuille-appel.component.html',
  styleUrls: ['./feuille-appel.component.scss'],
  animations: [scaleIn400ms, fadeInRight400ms],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatIconModule,
    MatButtonModule,
    MatButtonToggleModule,
    MatFormFieldModule,
    MatInputModule,
    MatTooltipModule,
    MatProgressSpinnerModule
  ]
})
export class FeuilleAppelComponent implements OnInit {
  private readonly assiduiteService = inject(AssiduiteService);
  private readonly notificationService = inject(NotificationService);
  private readonly router = inject(Router);

  readonly statuts = STATUTS_PRESENCE;

  private readonly contexte = lireAppelDepuisState(this.router);

  creneau: CreneauDuJour | null = null;
  date = '';
  lignes: LigneAppel[] = [];

  horsPeriode = false;
  modifiable = true;
  /** Vrai quand l'appel a déjà été fait : on corrige au lieu de créer. */
  dejaSaisi = false;
  coursNonAssure = false;
  commentaire: string | null = null;

  loading = true;
  saving = false;

  constructor() {
    this.creneau = this.contexte?.creneau ?? null;
    this.date = this.contexte?.date ?? '';
  }

  ngOnInit(): void {
    if (!this.creneau || !this.date) {
      this.notificationService.info('Sélectionnez un créneau dans la liste.');
      this.router.navigate([ROUTE_MES_CRENEAUX]);
      return;
    }

    this.charger();
  }

  private charger(): void {
    if (!this.creneau) return;

    this.loading = true;
    this.assiduiteService.getFeuilleAppel(this.creneau.id, this.date).subscribe({
      next: (feuille) => {
        this.loading = false;

        if (!feuille) {
          this.notificationService.error("Feuille d'appel introuvable");
          this.router.navigate([ROUTE_MES_CRENEAUX]);
          return;
        }

        this.creneau = feuille.creneau;
        this.lignes = feuille.lignes;
        this.horsPeriode = feuille.hors_periode;
        this.modifiable = feuille.modifiable;
        this.dejaSaisi = feuille.seance !== null;
        this.coursNonAssure = feuille.seance?.statut === 'NON_ASSUREE';
        this.commentaire = feuille.seance?.commentaire ?? null;
      },
      error: (err) => {
        this.loading = false;
        this.notificationService.error(
          err?.error?.message ?? "Erreur lors du chargement de la feuille d'appel"
        );
        this.router.navigate([ROUTE_MES_CRENEAUX]);
      }
    });
  }

  // ------------------------------------------------------------------
  // Saisie
  // ------------------------------------------------------------------

  /** Un clic sur le statut déjà actif remet l'élève présent. */
  basculer(ligne: LigneAppel, statut: StatutPresence): void {
    if (!this.saisieOuverte) return;

    ligne.statut = ligne.statut === statut ? null : statut;

    // Les minutes n'ont de sens que pour un retard.
    if (ligne.statut !== 'RETARD') {
      ligne.minutes_retard = null;
    }
  }

  /** Une absence collective se saisit en un geste plutôt qu'élève par élève. */
  toutMarquerAbsent(): void {
    if (!this.saisieOuverte) return;

    this.lignes.forEach((ligne) => {
      ligne.statut = 'ABSENT';
      ligne.minutes_retard = null;
    });
  }

  toutMarquerPresent(): void {
    if (!this.saisieOuverte) return;

    this.lignes.forEach((ligne) => {
      ligne.statut = null;
      ligne.minutes_retard = null;
      ligne.motif = null;
    });
  }

  basculerCoursNonAssure(): void {
    if (!this.saisieOuverte) return;

    this.coursNonAssure = !this.coursNonAssure;

    // Un cours qui n'a pas eu lieu ne relève aucune anomalie.
    if (this.coursNonAssure) {
      this.toutMarquerPresent();
    }
  }

  // ------------------------------------------------------------------
  // État
  // ------------------------------------------------------------------

  get saisieOuverte(): boolean {
    return this.modifiable && !this.saving;
  }

  get nbAbsents(): number {
    return this.lignes.filter((l) => l.statut === 'ABSENT').length;
  }

  get nbRetards(): number {
    return this.lignes.filter((l) => l.statut === 'RETARD').length;
  }

  get nbRenvoyes(): number {
    return this.lignes.filter((l) => l.statut === 'RENVOYE').length;
  }

  get nbPresents(): number {
    return this.lignes.filter((l) => l.statut === null).length;
  }

  get matiere(): string {
    return this.creneau?.affectation?.classe_matiere?.matiere?.nom ?? '—';
  }

  get classe(): string {
    return (
      this.creneau?.classe?.nom ??
      this.creneau?.affectation?.classe_matiere?.classe?.nom ??
      '—'
    );
  }

  heure(valeur: string | null | undefined): string {
    return valeur?.slice(0, 5) ?? '';
  }

  // ------------------------------------------------------------------
  // Enregistrement
  // ------------------------------------------------------------------

  enregistrer(): void {
    if (!this.creneau || !this.saisieOuverte) return;

    // Seules les anomalies partent : un élève présent n'a pas de ligne.
    const lignes: LigneAppelInput[] = this.coursNonAssure
      ? []
      : this.lignes
          .filter((l) => l.statut !== null)
          .map((l) => ({
            eleve_id: l.eleve_id,
            statut: l.statut as StatutPresence,
            minutes_retard: l.statut === 'RETARD' ? l.minutes_retard : null,
            motif: l.motif?.trim() || null
          }));

    this.saving = true;
    this.assiduiteService
      .enregistrerAppel({
        emploi_du_temps_id: this.creneau.id,
        date_seance: this.date,
        statut_seance: this.coursNonAssure ? 'NON_ASSUREE' : 'FAITE',
        commentaire: this.commentaire?.trim() || null,
        lignes
      })
      .subscribe({
        next: (res) => {
          this.saving = false;
          this.notificationService.success(res.message);
          this.dejaSaisi = true;
        },
        error: (err) => {
          this.saving = false;
          this.notificationService.error(
            err?.error?.message ?? "Erreur lors de l'enregistrement de l'appel"
          );
        }
      });
  }

  retour(): void {
    this.router.navigate([ROUTE_MES_CRENEAUX]);
  }
}
