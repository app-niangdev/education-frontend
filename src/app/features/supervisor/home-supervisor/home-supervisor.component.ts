import { CommonModule } from '@angular/common';
import { Component, computed, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ReactiveFormsModule, UntypedFormControl } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Router, RouterModule } from '@angular/router';
import { fadeInRight400ms } from '@vex/animations/fade-in-right.animation';
import { scaleIn400ms } from '@vex/animations/scale-in.animation';
import { stagger40ms } from '@vex/animations/stagger.animation';
import { AnneeScolaireService } from 'src/app/auth/services/annee-scolaire.service';
import { AssiduiteService } from 'src/app/auth/services/assiduite.service';
import { AuthService } from 'src/app/auth/services/auth.service';
import { NotificationService } from 'src/app/auth/services/Notification.service';
import { PeriodeService } from 'src/app/auth/services/periode.service';
import { CreneauDuJour, DashboardAssiduite } from 'src/app/interfaces/Assiduite';
import { Periode } from 'src/app/interfaces/Periode';

interface Compteur {
  label: string;
  valeur: number | string;
  icon: string;
  couleur: string;
  aide?: string;
}

/**
 * L'accueil du surveillant : son tableau de bord d'assiduite.
 *
 * Remplace les raccourcis statiques d'origine. Le taux d'appels faits est la
 * metrique de pilotage : sans elle, un faible taux d'absence peut aussi bien
 * signifier une ecole assidue qu'un appel que personne ne fait.
 */
@Component({
  selector: 'vex-home-supervisor',
  templateUrl: './home-supervisor.component.html',
  styleUrls: ['./home-supervisor.component.scss'],
  animations: [stagger40ms, scaleIn400ms, fadeInRight400ms],
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    MatIconModule,
    MatButtonModule,
    MatTooltipModule,
    MatProgressSpinnerModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatDatepickerModule
  ]
})
export class HomeSupervisorComponent implements OnInit {
  private readonly destroyRef = inject(DestroyRef);
  private readonly assiduiteService = inject(AssiduiteService);
  private readonly periodeService = inject(PeriodeService);
  private readonly anneeService = inject(AnneeScolaireService);
  private readonly notificationService = inject(NotificationService);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  readonly nom = this.authService.getCurrentUserSync()?.full_name ?? '';
  readonly stats = signal<DashboardAssiduite | null>(null);

  dateCtrl = new UntypedFormControl(new Date());
  periodeCtrl = new UntypedFormControl(null);

  periodes: Periode[] = [];
  loading = false;

  /** Distingue « pas encore chargé » de « chargement terminé sans données ». */
  chargementTente = false;

  ngOnInit(): void {
    // loadReferences() détermine la période courante puis déclenche loadData().
    // Il ne le fait que s'il trouve une période : on garde donc un appel de
    // repli ici pour ne jamais rester bloqué sur le spinner.
    this.loadReferences();

    [this.dateCtrl, this.periodeCtrl].forEach((ctrl) =>
      ctrl.valueChanges
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe(() => this.loadData())
    );
  }

  private loadReferences(): void {
    this.anneeService
      .getList(1, 100)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((annees) => {
        const active = annees.find((a) => a.en_cours) ?? annees[0];

        // Sans année scolaire, le dashboard reste consultable sans filtre
        // de période : on charge quand même plutôt que d'abandonner.
        if (!active) {
          this.loadData();
          return;
        }

        this.periodeService
          .getByAnnee(active.id)
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe((periodes) => {
            this.periodes = periodes;

            // La période en cours par défaut : c'est celle qui intéresse.
            const aujourdhui = this.dateIso(new Date());
            const courante = periodes.find(
              (p) =>
                !!aujourdhui &&
                p.date_debut <= aujourdhui &&
                p.date_fin >= aujourdhui
            );
            if (courante) {
              this.periodeCtrl.setValue(courante.id, { emitEvent: false });
            }

            this.loadData();
          });
      });
  }

  loadData(): void {
    this.loading = true;
    this.assiduiteService
      .getDashboard(this.dateIso(this.dateCtrl.value), this.periodeCtrl.value)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (stats) => {
          this.loading = false;
          this.chargementTente = true;
          this.stats.set(stats);

          // Le service intercepte les erreurs HTTP et émet null : sans ce test,
          // l'échec passerait pour un chargement réussi et vide.
          if (!stats) {
            this.notificationService.error(
              'Erreur lors du chargement du tableau de bord'
            );
          }
        },
        error: () => {
          this.loading = false;
          this.chargementTente = true;
          this.notificationService.error('Erreur lors du chargement du tableau de bord');
        }
      });
  }

  /** Le datepicker rend un Date ; l'API attend 'YYYY-MM-DD'. */
  private dateIso(valeur: unknown): string | null {
    if (!valeur) return null;

    const date = valeur instanceof Date ? valeur : new Date(valeur as string);
    if (Number.isNaN(date.getTime())) return null;

    // toISOString() bascule en UTC et peut reculer d'un jour.
    const mois = `${date.getMonth() + 1}`.padStart(2, '0');
    const jour = `${date.getDate()}`.padStart(2, '0');
    return `${date.getFullYear()}-${mois}-${jour}`;
  }

  // ------------------------------------------------------------------
  // Blocs d'affichage
  // ------------------------------------------------------------------

  /**
   * `computed` et non un getter : un getter reconstruit le tableau a chaque
   * cycle de detection, donc *ngFor detruit et recree ses quatre elements,
   * chaque recreation rejoue l'animation @scaleIn et reprogramme un cycle.
   * La page ne se stabilise alors jamais et le spinner tourne indefiniment.
   */
  readonly compteurs = computed<Compteur[]>(() => {
    const s = this.stats();
    if (!s) return [];

    return [
      {
        label: 'Absents du jour',
        valeur: s.compteurs.absents,
        icon: 'mat:group_off',
        couleur: 'bg-red-100 text-red-700'
      },
      {
        label: 'Retards',
        valeur: s.compteurs.retards,
        icon: 'mat:hourglass_empty',
        couleur: 'bg-amber-100 text-amber-700'
      },
      {
        label: 'Renvois de cours',
        valeur: s.compteurs.renvois,
        icon: 'mat:cancel',
        couleur: 'bg-purple-100 text-purple-700'
      },
      {
        label: 'Appels faits',
        valeur: `${s.appels.taux} %`,
        icon: 'mat:assignment_turned_in',
        couleur: this.classeTauxAppels,
        aide: `${s.appels.faites} / ${s.appels.attendues - s.appels.non_assurees} créneaux`
      }
    ];
  });

  /** Un taux d'appels bas rend tous les autres chiffres peu fiables. */
  private get classeTauxAppels(): string {
    const taux = this.stats()?.appels.taux ?? 0;

    if (taux >= 90) return 'bg-green-100 text-green-700';
    if (taux >= 60) return 'bg-amber-100 text-amber-700';
    return 'bg-red-100 text-red-700';
  }

  /** Meme raison que `compteurs` : `?? []` cree un tableau neuf a chaque appel. */
  readonly appelsManquants = computed<CreneauDuJour[]>(
    () => this.stats()?.appels_manquants ?? []
  );

  get tendanceMax(): number {
    // Évite une division par zéro et garde des barres lisibles quand tout est à 0.
    return Math.max(1, ...(this.stats()?.tendance ?? []).map((t) => t.total));
  }

  get repartitionMax(): number {
    return Math.max(
      0.1,
      ...(this.stats()?.par_classe ?? []).map((c) => c.heures_par_eleve)
    );
  }

  pourcentage(valeur: number, max: number): number {
    return Math.round((valeur / max) * 100);
  }

  heures(minutes: number): string {
    return (minutes / 60).toFixed(1).replace('.', ',');
  }

  matiere(creneau: CreneauDuJour): string {
    return creneau.affectation?.classe_matiere?.matiere?.nom ?? '—';
  }

  classe(creneau: CreneauDuJour): string {
    return creneau.classe?.nom ?? '—';
  }

  enseignant(creneau: CreneauDuJour): string {
    const user = creneau.affectation?.enseignant?.user;
    return user ? `${user.first_name ?? ''} ${user.last_name ?? ''}`.trim() : '—';
  }

  heure(valeur: string | null | undefined): string {
    return valeur?.slice(0, 5) ?? '';
  }

  // ------------------------------------------------------------------
  // Navigation
  // ------------------------------------------------------------------

  /** Le registre pré-filtré sur ce qui reste à traiter. */
  versAJustifier(): void {
    this.router.navigate(['/index/supervisor/attendance'], {
      state: { filtresAssiduite: { justifie: false } }
    });
  }

  versRegistre(): void {
    this.router.navigate(['/index/supervisor/attendance']);
  }
}
