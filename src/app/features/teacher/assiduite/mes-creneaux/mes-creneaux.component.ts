import { CommonModule } from '@angular/common';
import { Component, DestroyRef, inject, OnInit } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ReactiveFormsModule, UntypedFormControl } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Router } from '@angular/router';
import { fadeInRight400ms } from '@vex/animations/fade-in-right.animation';
import { scaleIn400ms } from '@vex/animations/scale-in.animation';
import { stagger40ms } from '@vex/animations/stagger.animation';
import { AssiduiteService } from 'src/app/auth/services/assiduite.service';
import { NotificationService } from 'src/app/auth/services/Notification.service';
import { CreneauDuJour, JourneeAppel } from 'src/app/interfaces/Assiduite';
import {
  ROUTE_FEUILLE_APPEL,
  STATE_CRENEAU,
  STATE_DATE_APPEL
} from '../assiduite-navigation';

/**
 * La journee de l'enseignant : ses creneaux, et pour chacun si l'appel est
 * fait. C'est son point d'entree quotidien.
 *
 * Le backend borne deja la liste a ses propres creneaux ; ce composant ne
 * refait pas ce controle.
 */
@Component({
  selector: 'vex-mes-creneaux',
  templateUrl: './mes-creneaux.component.html',
  styleUrls: ['./mes-creneaux.component.scss'],
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
    MatInputModule,
    MatDatepickerModule
  ]
})
export class MesCreneauxComponent implements OnInit {
  private readonly destroyRef = inject(DestroyRef);
  private readonly assiduiteService = inject(AssiduiteService);
  private readonly notificationService = inject(NotificationService);
  private readonly router = inject(Router);

  /** Par defaut aujourd'hui : c'est l'appel du jour qui interesse le prof. */
  dateCtrl = new UntypedFormControl(new Date());

  journee: JourneeAppel | null = null;
  loading = false;

  ngOnInit(): void {
    this.loadData();

    this.dateCtrl.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.loadData());
  }

  loadData(): void {
    const date = this.dateIso;
    if (!date) return;

    this.loading = true;
    this.assiduiteService.getCreneauxDuJour(date).subscribe({
      next: (journee) => {
        this.loading = false;
        this.journee = journee;
      },
      error: () => {
        this.loading = false;
        this.notificationService.error('Erreur lors du chargement des créneaux');
      }
    });
  }

  /** Le datepicker rend un Date ; l'API attend 'YYYY-MM-DD'. */
  private get dateIso(): string | null {
    const valeur = this.dateCtrl.value;
    if (!valeur) return null;

    const date = valeur instanceof Date ? valeur : new Date(valeur);
    if (Number.isNaN(date.getTime())) return null;

    // toISOString() bascule en UTC et peut reculer d'un jour : on compose
    // la date a la main depuis les champs locaux.
    const mois = `${date.getMonth() + 1}`.padStart(2, '0');
    const jour = `${date.getDate()}`.padStart(2, '0');
    return `${date.getFullYear()}-${mois}-${jour}`;
  }

  get creneaux(): CreneauDuJour[] {
    return this.journee?.creneaux ?? [];
  }

  get nbAppelsFaits(): number {
    return this.creneaux.filter((c) => !!c.seance).length;
  }

  /** On ne fait pas l'appel d'un cours qui n'a pas encore eu lieu. */
  get dateDansLeFutur(): boolean {
    const date = this.dateIso;
    if (!date) return false;

    const aujourdhui = new Date();
    const mois = `${aujourdhui.getMonth() + 1}`.padStart(2, '0');
    const jour = `${aujourdhui.getDate()}`.padStart(2, '0');

    return date > `${aujourdhui.getFullYear()}-${mois}-${jour}`;
  }

  matiere(creneau: CreneauDuJour): string {
    return creneau.affectation?.classe_matiere?.matiere?.nom ?? '—';
  }

  classe(creneau: CreneauDuJour): string {
    return creneau.classe?.nom ?? creneau.affectation?.classe_matiere?.classe?.nom ?? '—';
  }

  heure(valeur: string | null | undefined): string {
    return valeur?.slice(0, 5) ?? '';
  }

  /** Le nombre d'anomalies relevées, pour un aperçu sans ouvrir la feuille. */
  nbAnomalies(creneau: CreneauDuJour): number {
    return creneau.seance?.presences?.length ?? 0;
  }

  faireAppel(creneau: CreneauDuJour): void {
    const date = this.dateIso;
    if (!date || this.dateDansLeFutur) return;

    this.router.navigate([ROUTE_FEUILLE_APPEL], {
      state: {
        [STATE_CRENEAU]: creneau,
        [STATE_DATE_APPEL]: date
      }
    });
  }
}
