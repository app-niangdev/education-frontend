import { CommonModule } from '@angular/common';
import { Component, DestroyRef, inject, OnInit } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ReactiveFormsModule, UntypedFormControl } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Router } from '@angular/router';
import { fadeInRight400ms } from '@vex/animations/fade-in-right.animation';
import { scaleIn400ms } from '@vex/animations/scale-in.animation';
import { stagger40ms } from '@vex/animations/stagger.animation';
import { AnneeScolaireService } from 'src/app/auth/services/annee-scolaire.service';
import { AssiduiteService } from 'src/app/auth/services/assiduite.service';
import { AuthService } from 'src/app/auth/services/auth.service';
import { NotificationService } from 'src/app/auth/services/Notification.service';
import { PeriodeService } from 'src/app/auth/services/periode.service';
import {
  FicheAssiduiteEleve,
  Presence,
  StatutPresence
} from 'src/app/interfaces/Assiduite';
import { Periode } from 'src/app/interfaces/Periode';
import { JustifierDialogComponent } from '../justifier-dialog/justifier-dialog.component';
import {
  FiltresAssiduite,
  ROUTE_ASSIDUITE,
  STATE_FILTRES_ASSIDUITE,
  lireEleveAssiduiteDepuisState,
  lireFiltresDepuisState
} from '../assiduite-navigation';

/**
 * Le recapitulatif d'assiduite d'un eleve : totaux et historique detaille.
 *
 * C'est le document que le surveillant presente aux parents ou en conseil de
 * discipline, d'ou l'export PDF.
 */
@Component({
  selector: 'vex-fiche-eleve-absences',
  templateUrl: './fiche-eleve-absences.component.html',
  styleUrls: ['./fiche-eleve-absences.component.scss'],
  animations: [stagger40ms, scaleIn400ms, fadeInRight400ms],
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatIconModule,
    MatButtonModule,
    MatTooltipModule,
    MatProgressSpinnerModule,
    MatFormFieldModule,
    MatSelectModule,
    MatDialogModule
  ]
})
export class FicheEleveAbsencesComponent implements OnInit {
  private readonly destroyRef = inject(DestroyRef);
  private readonly assiduiteService = inject(AssiduiteService);
  private readonly periodeService = inject(PeriodeService);
  private readonly anneeService = inject(AnneeScolaireService);
  private readonly notificationService = inject(NotificationService);
  private readonly authService = inject(AuthService);
  private readonly dialog = inject(MatDialog);
  private readonly router = inject(Router);

  private readonly eleveId: number | null;
  private readonly filtres: FiltresAssiduite | null;

  periodeCtrl = new UntypedFormControl(null);

  fiche: FicheAssiduiteEleve | null = null;
  periodes: Periode[] = [];
  loading = false;
  downloading = false;

  constructor() {
    this.eleveId = lireEleveAssiduiteDepuisState(this.router);
    this.filtres = lireFiltresDepuisState(this.router);
  }

  ngOnInit(): void {
    if (this.eleveId === null) {
      this.notificationService.info('Sélectionnez un élève dans le registre.');
      this.retour();
      return;
    }

    this.loadReferences();
    this.charger();

    this.periodeCtrl.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.charger());
  }

  private loadReferences(): void {
    this.anneeService.getList(1, 100).subscribe((annees) => {
      const active = annees.find((a) => a.en_cours) ?? annees[0];
      if (active) {
        this.periodeService
          .getByAnnee(active.id)
          .subscribe((periodes) => (this.periodes = periodes));
      }
    });
  }

  private charger(): void {
    if (this.eleveId === null) return;

    this.loading = true;
    this.assiduiteService.getFicheEleve(this.eleveId, this.periodeCtrl.value).subscribe({
      next: (fiche) => {
        this.loading = false;
        this.fiche = fiche;

        if (!fiche) {
          this.notificationService.error("Fiche d'assiduité introuvable");
          this.retour();
        }
      },
      error: () => {
        this.loading = false;
        this.notificationService.error("Erreur lors du chargement de la fiche");
        this.retour();
      }
    });
  }

  retour(): void {
    // Les filtres repartent avec pour que le registre retrouve son état.
    this.router.navigate([ROUTE_ASSIDUITE(this.router)], {
      state: this.filtres ? { [STATE_FILTRES_ASSIDUITE]: this.filtres } : {}
    });
  }

  // ------------------------------------------------------------------
  // État
  // ------------------------------------------------------------------

  get peutJustifier(): boolean {
    return this.authService.getRole() !== 'teacher';
  }

  get presences(): Presence[] {
    return this.fiche?.presences ?? [];
  }

  statutClass(statut: StatutPresence): string {
    return {
      ABSENT: 'bg-red-100 text-red-800',
      RETARD: 'bg-amber-100 text-amber-800',
      RENVOYE: 'bg-purple-100 text-purple-800'
    }[statut];
  }

  matiere(presence: Presence): string {
    return presence.seance?.affectation?.classe_matiere?.matiere?.nom ?? '—';
  }

  creneau(presence: Presence): string {
    const debut = presence.seance?.heure_debut?.slice(0, 5) ?? '';
    const fin = presence.seance?.heure_fin?.slice(0, 5) ?? '';
    return debut && fin ? `${debut} – ${fin}` : '';
  }

  // ------------------------------------------------------------------
  // Actions
  // ------------------------------------------------------------------

  justifier(presence: Presence): void {
    this.dialog
      .open(JustifierDialogComponent, {
        width: '640px',
        disableClose: true,
        data: { presence }
      })
      .afterClosed()
      .subscribe((enregistre) => {
        if (enregistre) this.charger();
      });
  }

  telechargerPdf(): void {
    if (this.eleveId === null || this.downloading) return;

    this.downloading = true;
    this.assiduiteService
      .downloadFicheElevePdf(this.eleveId, this.periodeCtrl.value)
      .subscribe({
        next: (blob) => {
          this.downloading = false;
          const url = window.URL.createObjectURL(blob);
          const lien = document.createElement('a');
          lien.href = url;
          lien.download = `absences-${this.fiche?.eleve?.nom_complet ?? 'eleve'}.pdf`;
          lien.click();
          window.URL.revokeObjectURL(url);
        },
        error: () => {
          this.downloading = false;
          this.notificationService.error('Erreur lors de la génération du PDF');
        }
      });
  }
}
