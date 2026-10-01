import { CommonModule } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';
import { fadeInRight400ms } from '@vex/animations/fade-in-right.animation';
import { scaleIn400ms } from '@vex/animations/scale-in.animation';
import { stagger40ms } from '@vex/animations/stagger.animation';
import { BilanService } from 'src/app/auth/services/bilan.service';
import {
  Bilan,
  BilanEvolutionMois,
  BilanMois
} from 'src/app/interfaces/Bilan';

/** Une colonne de l'histogramme mensuel, déjà mise à l'échelle. */
interface ColonneMois {
  ligne: BilanEvolutionMois;
  /** Hauteurs en pourcentage de la plus haute valeur de la période. */
  hauteurEncaisse: number;
  hauteurDepense: number;
  selectionne: boolean;
}

/** Un poste de dépense prêt à l'affichage (largeur + teinte séquentielle). */
interface PosteDepense {
  libelle: string;
  montant: number;
  nombre: number;
  pct: number;
  /** Largeur relative au poste le plus lourd, pour que la barre se lise. */
  largeur: number;
  couleur: string;
}

/**
 * Le bilan financier de l'établissement, partagé par le trésorier et le
 * manager : même écran, deux points d'entrée, comme le module Dépenses.
 *
 * Deux natures de chiffres y cohabitent, et l'écran le dit explicitement :
 * les flux (encaissements, dépenses, résultat) suivent le filtre mensuel,
 * les créances restent cumulées sur l'année — un impayé d'octobre reste dû
 * en janvier, le borner au mois n'aurait aucun sens.
 */
@Component({
  selector: 'vex-bilan',
  templateUrl: './bilan.component.html',
  styleUrls: ['./bilan.component.scss'],
  animations: [stagger40ms, scaleIn400ms, fadeInRight400ms],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatIconModule,
    MatButtonModule,
    MatTooltipModule,
    MatProgressSpinnerModule,
    MatFormFieldModule,
    MatSelectModule
  ]
})
export class BilanComponent implements OnInit {
  private readonly bilanService = inject(BilanService);

  readonly bilan = signal<Bilan | null>(null);
  loading = false;

  /** Valeur du select : « annee-mois » (ex. « 2026-7 »), ou '' pour l'année. */
  moisSelectionne = '';

  /** Bascule le tableau de données, qui double les graphiques. */
  tableauVisible = false;

  private readonly couleursSequentielles = [
    'var(--viz-seq-1)',
    'var(--viz-seq-2)',
    'var(--viz-seq-3)',
    'var(--viz-seq-4)',
    'var(--viz-seq-5)',
    'var(--viz-seq-6)',
    'var(--viz-seq-7)'
  ];

  ngOnInit(): void {
    this.charger();
  }

  charger(): void {
    this.loading = true;

    const [annee, mois] = this.moisSelectionne
      ? this.moisSelectionne.split('-').map(Number)
      : [undefined, undefined];

    this.bilanService.getBilan({ mois, annee }).subscribe({
      next: (data) => {
        this.bilan.set(data);
        this.loading = false;
      },
      error: () => (this.loading = false)
    });
  }

  onMoisChange(): void {
    this.charger();
  }

  reinitialiser(): void {
    if (!this.moisSelectionne) return;
    this.moisSelectionne = '';
    this.charger();
  }

  /** Le mois d'une option du select, tel que stocké dans `moisSelectionne`. */
  valeurMois(mois: BilanMois): string {
    return `${mois.annee}-${mois.mois}`;
  }

  // ─── Évolution mensuelle (colonnes groupées) ─────────────────────────────

  /**
   * Les colonnes de l'année, mises à l'échelle de la plus haute valeur toutes
   * séries confondues : les deux séries partagent un axe unique, sans quoi
   * leurs hauteurs ne seraient pas comparables.
   */
  readonly colonnes = computed<ColonneMois[]>(() => {
    const lignes = this.bilan()?.evolution_mensuelle ?? [];
    const maximum = Math.max(
      ...lignes.map((l) => Math.max(l.encaisse, l.depense)),
      1
    );

    return lignes.map((ligne) => ({
      ligne,
      hauteurEncaisse: this.hauteurColonne(ligne.encaisse, maximum),
      hauteurDepense: this.hauteurColonne(ligne.depense, maximum),
      selectionne:
        this.moisSelectionne === `${ligne.annee}-${ligne.mois}`
    }));
  });

  /**
   * Hauteur d'une colonne, en pourcentage du maximum de la période.
   *
   * Un montant non nul ne descend jamais sous 2 % : face à un mois à 700 000,
   * un mois à 5 000 se réduirait à un trait invisible, impossible à survoler,
   * et le lecteur conclurait à tort qu'il ne s'est rien passé. Zéro reste zéro
   * — c'est la seule valeur qui a le droit de ne rien afficher.
   */
  private hauteurColonne(valeur: number, maximum: number): number {
    if (valeur <= 0) return 0;

    return Math.max((valeur / maximum) * 100, 2);
  }

  /** Vrai dès qu'un mouvement existe : sinon l'histogramme n'a rien à montrer. */
  readonly evolutionRenseignee = computed(() =>
    (this.bilan()?.evolution_mensuelle ?? []).some(
      (l) => l.encaisse > 0 || l.depense > 0
    )
  );

  /** Le plafond de l'axe, affiché comme repère chiffré. */
  readonly maximumEvolution = computed(() => {
    const lignes = this.bilan()?.evolution_mensuelle ?? [];
    return Math.max(...lignes.map((l) => Math.max(l.encaisse, l.depense)), 0);
  });

  /**
   * Le pied du tableau : la somme des mois affichés. Il porte donc l'année
   * entière, quel que soit le mois filtré — la courbe n'est jamais bornée.
   * Additionner ces colonnes est la seule lecture cohérente ; y mettre un
   * total issu d'un autre périmètre ferait un tableau qui ne s'additionne pas.
   */
  readonly totauxEvolution = computed(() => {
    const lignes = this.bilan()?.evolution_mensuelle ?? [];

    return lignes.reduce(
      (cumul, ligne) => ({
        encaisse: cumul.encaisse + ligne.encaisse,
        depense: cumul.depense + ligne.depense,
        solde: cumul.solde + ligne.solde
      }),
      { encaisse: 0, depense: 0, solde: 0 }
    );
  });

  // ─── Dépenses par poste ──────────────────────────────────────────────────

  /**
   * Les postes réellement mouvementés, du plus lourd au plus léger. Les postes
   * à zéro sont écartés : une barre vide n'apprend rien et allonge la lecture.
   */
  readonly postes = computed<PosteDepense[]>(() => {
    const depenses = this.bilan()?.depenses;
    if (!depenses || depenses.total <= 0) return [];

    const retenus = depenses.par_categorie
      .filter((c) => c.montant > 0)
      .sort((a, b) => b.montant - a.montant);

    const plusLourd = retenus[0]?.montant || 1;

    return retenus.map((categorie, index) => ({
      libelle: categorie.libelle,
      montant: categorie.montant,
      nombre: categorie.nombre,
      pct: Math.round((categorie.montant / depenses.total) * 100),
      largeur: (categorie.montant / plusLourd) * 100,
      couleur:
        this.couleursSequentielles[
          Math.min(index, this.couleursSequentielles.length - 1)
        ]
    }));
  });

  // ─── Encaissements par mode de paiement ──────────────────────────────────

  readonly modesRenseignes = computed(() =>
    (this.bilan()?.encaissements.par_mode_paiement ?? []).filter(
      (m) => m.montant > 0
    )
  );

  partDuMode(montant: number): number {
    const total = this.bilan()?.encaissements.total ?? 0;
    return total > 0 ? Math.round((montant / total) * 100) : 0;
  }

  // ─── Jauge de recouvrement ───────────────────────────────────────────────

  get gaugeDash(): string {
    const taux = this.bilan()?.creances.taux_recouvrement ?? 0;
    return `${taux} ${100 - taux}`;
  }

  // ─── Masse salariale ─────────────────────────────────────────────────────

  /**
   * L'écart entre décaissé et engagement n'a de sens qu'en vue mensuelle :
   * l'engagement porté par les contrats est un montant PAR MOIS, le comparer
   * à un cumul annuel opposerait deux échelles différentes.
   */
  readonly ecartSalaireComparable = computed(
    () => this.bilan()?.periode.type === 'mois'
  );

  /** Sous-paiement seulement : un dépassement peut être une prime, un rappel. */
  readonly alerteSalaire = computed(() => {
    const masse = this.bilan()?.masse_salariale;
    if (!masse || !this.ecartSalaireComparable()) return false;
    return masse.engagement_mensuel > 0 && masse.ecart < 0;
  });

  // ─── Mise en forme ───────────────────────────────────────────────────────

  formatMontant(montant: number): string {
    return new Intl.NumberFormat('fr-FR', {
      style: 'decimal',
      maximumFractionDigits: 0
    }).format(montant);
  }

  /** Montant signé : le sens du solde doit se lire sans comparer deux nombres. */
  formatSigne(montant: number): string {
    const signe = montant > 0 ? '+' : montant < 0 ? '−' : '';
    return `${signe}${this.formatMontant(Math.abs(montant))}`;
  }
}
