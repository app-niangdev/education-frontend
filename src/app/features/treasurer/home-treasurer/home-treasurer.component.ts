import { CommonModule } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Router } from '@angular/router';
import { fadeInRight400ms } from '@vex/animations/fade-in-right.animation';
import { scaleIn400ms } from '@vex/animations/scale-in.animation';
import { stagger40ms } from '@vex/animations/stagger.animation';
import { StatistiqueService } from 'src/app/auth/services/statistique.service';
import { DashboardTresorier } from 'src/app/interfaces/Statistique';
import { RelancesDialogComponent } from '../mensualites/relances-dialog/relances-dialog.component';

interface ModeBar {
  mode: string;
  label: string;
  montant: number;
  pct: number;
  varName: string;
}

const MODE_LABELS: Record<string, string> = {
  ESPECES: 'Espèces',
  WAVE: 'Wave',
  ORANGE_MONEY: 'Orange Money',
  FREE_MONEY: 'Free Money'
};

// Ordre catégoriel fixe → couleur fixe par mode (jamais recyclée).
const MODE_VARS: Record<string, string> = {
  ESPECES: 'var(--viz-c1)',
  WAVE: 'var(--viz-c2)',
  ORANGE_MONEY: 'var(--viz-c3)',
  FREE_MONEY: 'var(--viz-c4)'
};

@Component({
  selector: 'vex-home-treasurer',
  templateUrl: './home-treasurer.component.html',
  styleUrls: ['./home-treasurer.component.scss'],
  animations: [stagger40ms, scaleIn400ms, fadeInRight400ms],
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatIconModule,
    MatTooltipModule,
    MatProgressSpinnerModule
  ]
})
export class HomeTreasurerComponent implements OnInit {
  private readonly statService = inject(StatistiqueService);
  private readonly router = inject(Router);
  private readonly dialog = inject(MatDialog);

  readonly stats = signal<DashboardTresorier | null>(null);
  loading = false;

  ngOnInit(): void {
    this.charger();
  }

  private charger(): void {
    this.loading = true;
    this.statService.getDashboardTresorier().subscribe({
      next: (data) => {
        this.stats.set(data);
        this.loading = false;
      },
      error: () => (this.loading = false)
    });
  }

  // ─── Effectifs ───────────────────────────────────────────────────────────────

  /** Les inscriptions en attente sont la file de travail de la caisse. */
  voirEncaissements(): void {
    this.router.navigate(['/index/treasurer/encaissements']);
  }

  /**
   * La tuile « en retard » mène droit à l'action : relancer. Les chiffres
   * sont rechargés à la fermeture — un paiement a pu être saisi entre-temps.
   */
  relancerImpayes(): void {
    this.dialog
      .open(RelancesDialogComponent, {
        width: '720px',
        maxHeight: '90vh',
        disableClose: true
      })
      .afterClosed()
      .subscribe(() => this.charger());
  }

  /** Ligne « Total » du tableau par niveau. */
  get totalNiveaux(): { eleves: number; en_retard: number; du: number; encaisse: number; reste: number } {
    return (this.stats()?.par_niveau ?? []).reduce(
      (t, n) => ({
        eleves: t.eleves + n.eleves,
        en_retard: t.en_retard + n.en_retard,
        du: t.du + n.du,
        encaisse: t.encaisse + n.encaisse,
        reste: t.reste + n.reste
      }),
      { eleves: 0, en_retard: 0, du: 0, encaisse: 0, reste: 0 }
    );
  }

  // ─── Jauge de recouvrement ───────────────────────────────────────────────────

  get gaugeDash(): string {
    const taux = this.stats()?.finances.taux_recouvrement ?? 0;
    return `${taux} ${100 - taux}`;
  }

  // ─── Répartition par mode de paiement (barre empilée) ────────────────────────

  get totalModes(): number {
    return (this.stats()?.par_mode_paiement ?? []).reduce((s, m) => s + m.montant, 0);
  }

  readonly modeBars = computed<ModeBar[]>(() => {
    const list = this.stats()?.par_mode_paiement ?? [];
    const total = list.reduce((s, m) => s + m.montant, 0) || 1;
    return list.map((m) => ({
      mode: m.mode,
      label: MODE_LABELS[m.mode] ?? m.mode,
      montant: m.montant,
      pct: Math.round((m.montant / total) * 100),
      varName: MODE_VARS[m.mode] ?? 'var(--viz-c1)'
    }));
  });

  // ─── Mensualités par statut ──────────────────────────────────────────────────

  pctMensualite(part: 'paye' | 'partiel' | 'non_paye'): number {
    const m = this.stats()?.mensualites_par_statut;
    if (!m || m.total <= 0) return 0;
    return Math.round((m[part] / m.total) * 100);
  }

  // ─── Finances ────────────────────────────────────────────────────────────────

  pctEncaisse(bloc: 'inscriptions' | 'mensualites' | 'total'): number {
    const f = this.stats()?.finances[bloc];
    if (!f || f.du <= 0) return 0;
    return Math.round((f.encaisse / f.du) * 100);
  }

  formatMontant(montant: number): string {
    return new Intl.NumberFormat('fr-FR', {
      style: 'decimal',
      maximumFractionDigits: 0
    }).format(montant);
  }
}
