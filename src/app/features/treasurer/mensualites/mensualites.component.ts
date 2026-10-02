import { CommonModule } from '@angular/common';
import { Component, DestroyRef, inject, OnInit } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ReactiveFormsModule, UntypedFormControl } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { fadeInRight400ms } from '@vex/animations/fade-in-right.animation';
import { scaleIn400ms } from '@vex/animations/scale-in.animation';
import { stagger40ms } from '@vex/animations/stagger.animation';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { AuthService } from 'src/app/auth/services/auth.service';
import { FinanceTresorierService } from 'src/app/auth/services/finance-tresorier.service';
import { NotificationService } from 'src/app/auth/services/Notification.service';
import { Inscription } from 'src/app/interfaces/Inscription';
import { Mensualite, MOIS_FR } from 'src/app/interfaces/Mensualite';
import { PayerFactureDialogComponent } from './payer-facture-dialog/payer-facture-dialog.component';
import { RelancesDialogComponent } from './relances-dialog/relances-dialog.component';
import { RecusMensualitesDialogComponent } from './recus-mensualites-dialog/recus-mensualites-dialog.component';
import { PayerMensualiteDialogComponent } from './payer-mensualite-dialog/payer-mensualite-dialog.component';

@Component({
  selector: 'vex-mensualites',
  templateUrl: './mensualites.component.html',
  animations: [stagger40ms, scaleIn400ms, fadeInRight400ms],
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatIconModule,
    MatButtonModule,
    MatTooltipModule,
    MatProgressSpinnerModule,
    MatPaginatorModule,
    MatFormFieldModule,
    MatInputModule,
    MatDialogModule
  ]
})
export class MensualitesComponent implements OnInit {
  private readonly destroyRef = inject(DestroyRef);
  private readonly financeService = inject(FinanceTresorierService);
  private readonly notificationService = inject(NotificationService);
  private readonly dialog = inject(MatDialog);
  private readonly authService = inject(AuthService);

  readonly inscriptions = this.financeService.inscriptionsMensualites;
  readonly meta = this.financeService.inscriptionsMensualitesMeta;

  /** Sans droit de caisse, la consultation reste ouverte mais pas l'encaissement. */
  readonly accesCaisse = this.authService.hasAccesCaisse();

  searchCtrl = new UntypedFormControl('');
  loading = false;

  page = 1;
  perPage = 10;

  /** Ids des inscriptions dont le détail des mois est déplié. */
  private readonly ouverts = new Set<number>();

  ngOnInit(): void {
    this.loadData();

    this.searchCtrl.valueChanges
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe(() => {
        this.page = 1;
        this.loadData();
      });
  }

  loadData(): void {
    this.loading = true;

    this.financeService
      .getInscriptionsMensualites(this.page, this.perPage, (this.searchCtrl.value ?? '').trim())
      .subscribe({
        next: () => (this.loading = false),
        error: () => {
          this.loading = false;
          this.notificationService.error(
            'Erreur lors du chargement des mensualités'
          );
        }
      });
  }

  onPageChange(event: PageEvent): void {
    this.page = event.pageIndex + 1;
    this.perPage = event.pageSize;
    this.loadData();
  }

  // ─── Dépliage ──────────────────────────────────────────────────────────────

  estOuvert(i: Inscription): boolean {
    return this.ouverts.has(i.id);
  }

  basculer(i: Inscription): void {
    if (this.ouverts.has(i.id)) this.ouverts.delete(i.id);
    else this.ouverts.add(i.id);
  }

  // ─── Agrégats par élève ──────────────────────────────────────────────────────

  mensualites(i: Inscription): Mensualite[] {
    return i.mensualites ?? [];
  }

  totalDu(i: Inscription): number {
    return this.mensualites(i).reduce((s, m) => s + m.montant_mensualite, 0);
  }

  totalPaye(i: Inscription): number {
    return this.mensualites(i).reduce((s, m) => s + (m.total_paye ?? 0), 0);
  }

  resteTotal(i: Inscription): number {
    return this.mensualites(i).reduce((s, m) => s + (m.reste ?? m.montant_mensualite), 0);
  }

  /** Progression payée sur l'année, en pourcentage entier. */
  progression(i: Inscription): number {
    const du = this.totalDu(i);
    if (du <= 0) return 0;
    return Math.round((this.totalPaye(i) / du) * 100);
  }

  nbNonSoldes(i: Inscription): number {
    return this.mensualites(i).filter((m) => (m.reste ?? m.montant_mensualite) > 0).length;
  }

  // ─── Encaissements ───────────────────────────────────────────────────────────

  /**
   * Règlement de plusieurs mois sur une seule facture : soit en saisissant le
   * montant reçu (réparti en cascade sur les mois les plus anciens), soit en
   * cochant les mois voulus. Un seul numéro, un seul justificatif.
   */
  versementGlobal(i: Inscription): void {
    if (!this.accesCaisse) return;

    this.dialog
      .open(PayerFactureDialogComponent, {
        width: '720px',
        maxHeight: '90vh',
        disableClose: true,
        data: { inscription: i }
      })
      .afterClosed()
      .subscribe((paye) => {
        if (paye) this.loadData();
      });
  }

  /**
   * Justificatifs déjà émis sur les mensualités de cet élève.
   *
   * Le reçu d'un règlement multi-mois n'était proposé qu'au moment du
   * paiement : une fois la fenêtre d'encaissement fermée, plus rien n'y
   * ramenait, alors que le document existe côté serveur et qu'une famille le
   * réclame souvent bien après son passage à la caisse.
   *
   * Consultation seule : aucune restriction de caisse, imprimer un reçu déjà
   * émis n'encaisse rien.
   */
  voirRecus(i: Inscription): void {
    this.dialog.open(RecusMensualitesDialogComponent, {
      width: '640px',
      maxHeight: '90vh',
      data: { inscription: i }
    });
  }

  /**
   * Relance WhatsApp des familles en retard. Ouverte à tout trésorier, même
   * sans droit de caisse : relancer n'encaisse rien.
   */
  relancerImpayes(): void {
    this.dialog.open(RelancesDialogComponent, {
      width: '720px',
      maxHeight: '90vh',
      disableClose: true
    });
  }

  /** Encaissement d'un mois précis (éventuellement par tranche). */
  encaisserMois(mensualite: Mensualite): void {
    if (!this.accesCaisse) return;

    this.dialog
      .open(PayerMensualiteDialogComponent, {
        width: '640px',
        maxHeight: '90vh',
        disableClose: true,
        data: { mensualite }
      })
      .afterClosed()
      .subscribe((paye) => {
        if (paye) this.loadData();
      });
  }

  // ─── Libellés ────────────────────────────────────────────────────────────────

  libelleMois(m: Mensualite): string {
    return `${MOIS_FR[m.mois] ?? m.mois} ${m.annee}`;
  }

  statutLabel(m: Mensualite): string {
    switch (m.statut) {
      case 'NON_PAYE':
        return 'Non payé';
      case 'PARTIEL':
        return 'Partiel';
      case 'PAYE':
        return 'Payé';
      default:
        return '—';
    }
  }

  statutClass(m: Mensualite): string {
    switch (m.statut) {
      case 'PARTIEL':
        return 'bg-amber-100 text-amber-800';
      case 'PAYE':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  }

  moisSolde(m: Mensualite): boolean {
    return (m.reste ?? m.montant_mensualite) <= 0;
  }
}
