import { CommonModule } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { fadeInRight400ms } from '@vex/animations/fade-in-right.animation';
import { scaleIn400ms } from '@vex/animations/scale-in.animation';
import { stagger40ms } from '@vex/animations/stagger.animation';
import { StatistiqueService } from 'src/app/auth/services/statistique.service';
import { DashboardStats } from 'src/app/interfaces/Statistique';

interface StatTile {
  label: string;
  value: number;
  icon: string;
}

interface NiveauBar {
  niveau: string;
  code: string;
  total: number;
  pct: number;
}

@Component({
  selector: 'vex-home-manager',
  templateUrl: './home-manager.component.html',
  styleUrls: ['./home-manager.component.scss'],
  animations: [stagger40ms, scaleIn400ms, fadeInRight400ms],
  standalone: true,
  imports: [
    CommonModule,
    MatIconModule,
    MatTooltipModule,
    MatProgressSpinnerModule
  ]
})
export class HomeManagerComponent implements OnInit {
  private readonly statService = inject(StatistiqueService);

  readonly stats = signal<DashboardStats | null>(null);
  loading = false;

  ngOnInit(): void {
    this.loading = true;
    this.statService.getDashboard().subscribe({
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
      { label: 'Élèves inscrits', value: e.eleves_inscrits, icon: 'mat:person' },
      { label: 'Classes', value: e.classes, icon: 'mat:school' },
      { label: 'Niveaux', value: e.niveaux, icon: 'mat:grade' },
      { label: 'Enseignants', value: e.enseignants, icon: 'mat:assignment_turned_in' },
      { label: 'Surveillants', value: e.surveillants, icon: 'mat:visibility' },
      { label: 'Trésoriers', value: e.tresoriers, icon: 'mat:receipt' }
    ];
  });

  // ─── Répartition par sexe (donut) ────────────────────────────────────────────

  get totalSexe(): number {
    const s = this.stats()?.eleves_par_sexe;
    return s ? s.masculin + s.feminin : 0;
  }

  pctSexe(part: 'masculin' | 'feminin'): number {
    const total = this.totalSexe;
    if (total <= 0) return 0;
    return Math.round((this.stats()!.eleves_par_sexe[part] / total) * 100);
  }

  /**
   * Longueur d'arc (sur un périmètre de 100) pour le segment « masculin » du
   * donut. Le segment « féminin » occupe le reste via un décalage.
   */
  get dashMasculin(): string {
    const total = this.totalSexe;
    const part = total > 0 ? (this.stats()!.eleves_par_sexe.masculin / total) * 100 : 0;
    return `${part} ${100 - part}`;
  }

  // ─── Élèves par niveau (barres horizontales) ─────────────────────────────────

  readonly niveauxBars = computed<NiveauBar[]>(() => {
    const list = this.stats()?.eleves_par_niveau ?? [];
    const max = Math.max(1, ...list.map((n) => n.total));
    return list.map((n) => ({
      ...n,
      pct: Math.round((n.total / max) * 100)
    }));
  });

  // ─── Finances ────────────────────────────────────────────────────────────────

  pctEncaisse(bloc: 'inscriptions' | 'mensualites' | 'total'): number {
    const f = this.stats()?.finances[bloc];
    if (!f || f.du <= 0) return 0;
    return Math.round((f.encaisse / f.du) * 100);
  }

  /** Décalage de l'arc de la jauge de recouvrement (périmètre 100). */
  get gaugeDash(): string {
    const taux = this.stats()?.finances.taux_recouvrement ?? 0;
    return `${taux} ${100 - taux}`;
  }

  formatMontant(montant: number): string {
    return new Intl.NumberFormat('fr-FR', {
      style: 'decimal',
      maximumFractionDigits: 0
    }).format(montant);
  }
}
