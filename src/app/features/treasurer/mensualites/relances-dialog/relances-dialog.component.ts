import { CommonModule } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { firstValueFrom } from 'rxjs';

import { FinanceTresorierService } from 'src/app/auth/services/finance-tresorier.service';
import { NotificationService } from 'src/app/auth/services/Notification.service';
import {
  ArriereEleve,
  Debiteur,
  RelanceHistorique
} from 'src/app/interfaces/Relance';
import {
  initialPaginationMeta,
  PaginationMeta
} from 'src/app/response-type/Type';

/** Pause entre deux envois d'un lot : WhatsApp tolère mal les rafales. */
const PAUSE_ENTRE_ENVOIS_MS = 1500;

/**
 * Relance WhatsApp des familles en retard de paiement.
 *
 * Une ligne par tuteur, pas par élève : une fratrie reçoit un seul message,
 * qui détaille chaque enfant. Le trésorier relance une famille, ou toutes
 * celles qui peuvent l'être.
 *
 * Le serveur recalcule les arriérés à chaque envoi : une famille qui a payé
 * depuis l'ouverture de la fenêtre n'est pas relancée.
 *
 * Le second onglet garde la trace de ce qui est parti : relances du
 * trésorier et rappels automatiques d'échéance, réussis ou non.
 */
@Component({
  selector: 'vex-relances-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatButtonModule,
    MatDialogModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatPaginatorModule,
    MatProgressSpinnerModule,
    MatTooltipModule
  ],
  templateUrl: './relances-dialog.component.html'
})
export class RelancesDialogComponent implements OnInit {
  private readonly financeService = inject(FinanceTresorierService);
  private readonly notification = inject(NotificationService);
  private readonly dialogRef =
    inject<MatDialogRef<RelancesDialogComponent>>(MatDialogRef);

  readonly onglet = signal<'relancer' | 'historique'>('relancer');

  readonly debiteurs = signal<Debiteur[]>([]);
  readonly chargement = signal(true);

  // ─── Historique ──────────────────────────────────────────────────────────────

  readonly historique = signal<RelanceHistorique[]>([]);
  readonly historiqueMeta = signal<PaginationMeta>(initialPaginationMeta);
  readonly chargementHistorique = signal(false);
  readonly rechercheHistorique = signal('');

  private pageHistorique = 1;
  private perPageHistorique = 10;
  private attenteRecherche?: ReturnType<typeof setTimeout>;

  /** Faux tant que WhatsApp n'est pas configuré pour l'établissement. */
  readonly active = signal(true);
  readonly delaiHeures = signal(0);

  readonly recherche = signal('');

  /** Id du tuteur dont la relance est en cours d'envoi. */
  readonly envoiId = signal<number | null>(null);

  /** Avancement d'un envoi groupé, ou null hors lot. */
  readonly lot = signal<{ fait: number; total: number } | null>(null);

  readonly filtres = computed(() => {
    const terme = this.recherche().trim().toLowerCase();
    if (!terme) return this.debiteurs();

    return this.debiteurs().filter(
      (d) =>
        d.tuteur.nom_complet.toLowerCase().includes(terme) ||
        (d.tuteur.telephone ?? '').includes(terme) ||
        d.eleves.some(
          (e) =>
            e.nom_complet.toLowerCase().includes(terme) ||
            e.matricule.toLowerCase().includes(terme)
        )
    );
  });

  readonly totalDu = computed(() =>
    this.debiteurs().reduce((somme, d) => somme + d.total, 0)
  );

  /** Les familles qu'un envoi groupé peut atteindre. */
  readonly relancables = computed(() =>
    this.debiteurs().filter((d) => d.blocage === null)
  );

  get occupe(): boolean {
    return this.envoiId() !== null || this.lot() !== null;
  }

  ngOnInit(): void {
    this.charger();
  }

  private charger(): void {
    this.chargement.set(true);

    this.financeService.getDebiteurs().subscribe({
      next: (payload) => {
        this.debiteurs.set(payload.debiteurs);
        this.active.set(payload.active);
        this.delaiHeures.set(payload.delai_heures);
        this.chargement.set(false);
      },
      error: () => {
        this.chargement.set(false);
        this.notification.error(
          'Erreur lors du chargement des familles en retard.'
        );
      }
    });
  }

  /**
   * L'historique est rechargé à chaque ouverture de l'onglet : une relance
   * envoyée à l'instant depuis le premier doit y apparaître.
   */
  changerOnglet(onglet: 'relancer' | 'historique'): void {
    if (this.onglet() === onglet || this.lot() !== null) return;

    this.onglet.set(onglet);

    if (onglet === 'historique') {
      this.pageHistorique = 1;
      this.chargerHistorique();
    }
  }

  private chargerHistorique(): void {
    this.chargementHistorique.set(true);

    this.financeService
      .getHistoriqueRelances(
        this.pageHistorique,
        this.perPageHistorique,
        this.rechercheHistorique().trim()
      )
      .subscribe({
        next: ({ relances, meta }) => {
          this.historique.set(relances);
          this.historiqueMeta.set(meta);
          this.chargementHistorique.set(false);
        },
        error: () => {
          this.chargementHistorique.set(false);
          this.notification.error(
            "Erreur lors du chargement de l'historique des relances."
          );
        }
      });
  }

  /** La recherche part au serveur : on attend la fin de la frappe. */
  rechercherHistorique(terme: string): void {
    this.rechercheHistorique.set(terme);

    clearTimeout(this.attenteRecherche);
    this.attenteRecherche = setTimeout(() => {
      this.pageHistorique = 1;
      this.chargerHistorique();
    }, 300);
  }

  onPageHistorique(event: PageEvent): void {
    this.pageHistorique = event.pageIndex + 1;
    this.perPageHistorique = event.pageSize;
    this.chargerHistorique();
  }

  /** « Inscription, Octobre 2026, Novembre 2026 » : ce qui est dû, en clair. */
  detail(e: ArriereEleve): string {
    return [
      ...(e.reste_inscription > 0 ? ["frais d'inscription"] : []),
      ...e.mois.map((m) => m.libelle)
    ].join(', ');
  }

  async relancer(d: Debiteur): Promise<void> {
    if (this.occupe || d.blocage !== null) return;

    this.envoiId.set(d.tuteur.id);
    const resultat = await this.envoyer(d);
    this.envoiId.set(null);

    if (resultat.ok) {
      this.notification.success(resultat.message);
    } else {
      this.notification.error(resultat.message);
    }
  }

  /**
   * Relance toutes les familles joignables, l'une après l'autre. Le lot
   * s'arrête dès que le service WhatsApp est en panne : inutile d'enchaîner
   * des échecs identiques.
   */
  async relancerTout(): Promise<void> {
    const cibles = this.relancables();
    if (this.occupe || cibles.length === 0) return;

    let envoyees = 0;
    let echecs = 0;
    let panne: string | null = null;

    this.lot.set({ fait: 0, total: cibles.length });

    for (const [index, d] of cibles.entries()) {
      this.envoiId.set(d.tuteur.id);
      const resultat = await this.envoyer(d);

      if (resultat.ok) envoyees++;
      else echecs++;

      this.lot.set({ fait: index + 1, total: cibles.length });

      if (resultat.fatal) {
        panne = resultat.message;
        break;
      }

      if (index < cibles.length - 1) {
        await new Promise((r) => setTimeout(r, PAUSE_ENTRE_ENVOIS_MS));
      }
    }

    this.envoiId.set(null);
    this.lot.set(null);

    if (panne !== null) {
      this.notification.error(
        `${panne} ${envoyees} relance(s) envoyée(s) avant l'arrêt.`
      );
    } else if (echecs > 0) {
      this.notification.info(
        `${envoyees} relance(s) envoyée(s), ${echecs} non envoyée(s).`
      );
    } else {
      this.notification.success(`${envoyees} relance(s) envoyée(s).`);
    }
  }

  /**
   * Envoie une relance et reporte l'issue sur la ligne : une famille relancée
   * passe aussitôt en « déjà relancée », sans recharger la liste.
   */
  private async envoyer(
    d: Debiteur
  ): Promise<{ ok: boolean; fatal: boolean; message: string }> {
    try {
      const res = await firstValueFrom(
        this.financeService.relancerTuteur(d.tuteur.id)
      );

      this.majLigne(d.tuteur.id, {
        derniere_relance_at:
          res.payload?.derniere_relance_at ?? new Date().toISOString(),
        blocage: 'recent',
        blocage_message: `Famille déjà relancée il y a moins de ${this.delaiHeures()} h.`
      });

      return { ok: true, fatal: false, message: res.message };
    } catch (err: any) {
      const message = err?.error?.message ?? "La relance n'a pas pu être envoyée.";

      // 422 : la relance est sans objet (payé entre-temps, déjà relancée…).
      // Le motif devient celui de la ligne.
      if (err?.status === 422) {
        this.majLigne(d.tuteur.id, {
          blocage: 'recent',
          blocage_message: message
        });
      }

      return { ok: false, fatal: err?.status === 503, message };
    }
  }

  private majLigne(tuteurId: number, patch: Partial<Debiteur>): void {
    this.debiteurs.update((liste) =>
      liste.map((d) => (d.tuteur.id === tuteurId ? { ...d, ...patch } : d))
    );
  }

  fermer(): void {
    this.dialogRef.close();
  }
}
