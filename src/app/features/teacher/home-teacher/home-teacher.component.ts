import { CommonModule } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { fadeInRight400ms } from '@vex/animations/fade-in-right.animation';
import { scaleIn400ms } from '@vex/animations/scale-in.animation';
import { stagger40ms } from '@vex/animations/stagger.animation';
import { StatistiqueService } from 'src/app/auth/services/statistique.service';
import { DashboardEnseignant } from 'src/app/interfaces/Statistique';

interface StatTile {
  label: string;
  value: number;
  icon: string;
}

interface TypeBar {
  label: string;
  total: number;
  pct: number;
}

const TYPE_LABELS: Record<string, string> = {
  DEVOIR_1: 'Devoir 1',
  DEVOIR_2: 'Devoir 2',
  COMPOSITION: 'Composition'
};

@Component({
  selector: 'vex-home-teacher',
  templateUrl: './home-teacher.component.html',
  styleUrls: ['./home-teacher.component.scss'],
  animations: [stagger40ms, scaleIn400ms, fadeInRight400ms],
  standalone: true,
  imports: [
    CommonModule,
    MatIconModule,
    MatTooltipModule,
    MatProgressSpinnerModule
  ]
})
export class HomeTeacherComponent implements OnInit {
  private readonly statService = inject(StatistiqueService);

  readonly stats = signal<DashboardEnseignant | null>(null);
  loading = false;

  ngOnInit(): void {
    this.loading = true;
    this.statService.getDashboardEnseignant().subscribe({
      next: (data) => {
        this.stats.set(data);
        this.loading = false;
      },
      error: () => (this.loading = false)
    });
  }

  // ─── Tuiles d'effectifs ──────────────────────────────────────────────────────

  readonly tiles = computed<StatTile[]>(() => {
    const e = this.stats()?.effectifs;
    if (!e) return [];
    return [
      { label: 'Affectations', value: e.affectations, icon: 'mat:assignment_turned_in' },
      { label: 'Classes', value: e.classes, icon: 'mat:school' },
      { label: 'Matières', value: e.matieres, icon: 'mat:book' },
      { label: 'Élèves', value: e.eleves, icon: 'mat:person' }
    ];
  });

  // ─── Évaluations par type (barres) ───────────────────────────────────────────

  readonly typeBars = computed<TypeBar[]>(() => {
    const et = this.stats()?.evaluations_par_type;
    if (!et) return [];
    const types = Object.keys(TYPE_LABELS);
    const max = Math.max(1, ...types.map((t) => et[t] ?? 0));
    return types.map((t) => ({
      label: TYPE_LABELS[t],
      total: et[t] ?? 0,
      pct: Math.round(((et[t] ?? 0) / max) * 100)
    }));
  });

  get totalEvaluations(): number {
    return this.stats()?.evaluations_par_type.total ?? 0;
  }

  // ─── Saisie des notes (jauge) ────────────────────────────────────────────────

  get tauxSaisie(): number {
    return this.stats()?.saisie_notes.taux ?? 0;
  }

  get gaugeDash(): string {
    return `${this.tauxSaisie} ${100 - this.tauxSaisie}`;
  }

  /** Pourcentage d'évaluations entièrement saisies. */
  get pctCompletes(): number {
    const s = this.stats()?.saisie_notes;
    if (!s || s.evaluations_total <= 0) return 0;
    return Math.round((s.evaluations_completes / s.evaluations_total) * 100);
  }
}
