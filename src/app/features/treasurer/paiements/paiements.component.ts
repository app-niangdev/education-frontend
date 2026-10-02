import { CommonModule } from '@angular/common';
import { Component, DestroyRef, inject, OnInit } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ReactiveFormsModule, UntypedFormControl } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { PageEvent } from '@angular/material/paginator';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ListeLigneComponent } from 'src/app/shared/liste/liste-ligne.component';
import { ListePageComponent } from 'src/app/shared/liste/liste-page.component';
import { fadeInRight400ms } from '@vex/animations/fade-in-right.animation';
import { scaleIn400ms } from '@vex/animations/scale-in.animation';
import { stagger40ms } from '@vex/animations/stagger.animation';
import { Observable } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { FinanceTresorierService } from 'src/app/auth/services/finance-tresorier.service';
import { NotificationService } from 'src/app/auth/services/Notification.service';
import { FactureMensualite } from 'src/app/interfaces/Mensualite';
import { MODES_PAIEMENT, PaiementInscription } from 'src/app/interfaces/Paiement';
import { PaginationMeta } from 'src/app/response-type/Type';

@Component({
  selector: 'vex-paiements',
  templateUrl: './paiements.component.html',
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
    ListePageComponent,
    ListeLigneComponent
  ]
})
export class PaiementsComponent implements OnInit {
  private readonly destroyRef = inject(DestroyRef);
  private readonly financeService = inject(FinanceTresorierService);
  private readonly notificationService = inject(NotificationService);

  readonly paiements = this.financeService.paiements;
  readonly meta = this.financeService.paiementsMeta;

  /**
   * Les encaissements de mensualites, regroupes par facture.
   *
   * Un reglement multi-mois cree une facture (FAM-xxx) et une ligne par mois.
   * C'est la facture qui porte le justificatif : lister les lignes donnerait
   * cinq entrees pour un seul versement, et cinq boutons vers le meme PDF.
   */
  readonly factures = this.financeService.factures;
  readonly facturesMeta = this.financeService.facturesMeta;

  /**
   * L'onglet courant. Les deux encaissements ne vivent pas dans la meme
   * table et n'ont ni le meme justificatif ni le meme numero : les melanger
   * dans une liste unique rendrait le tri et la recherche trompeurs.
   */
  onglet: 'inscription' | 'mensualite' = 'inscription';

  searchCtrl = new UntypedFormControl('');
  loading = false;

  page = 1;
  perPage = 10;

  /** Id du paiement dont le justificatif est en cours de génération. */
  downloadingId: number | null = null;

  /** Id de la facture dont le justificatif est en cours de génération. */
  downloadingFactureId: number | null = null;

  /**
   * Le justificatif en cours de renvoi sur WhatsApp. La clef porte l'onglet :
   * un paiement et une facture peuvent partager le même identifiant.
   */
  envoiWhatsapp: string | null = null;

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

  /**
   * Bascule d'onglet. La pagination et la recherche repartent de zero : les
   * deux listes n'ont ni la meme longueur ni les memes numeros, rester en
   * page 3 afficherait le plus souvent du vide.
   */
  changerOnglet(onglet: 'inscription' | 'mensualite'): void {
    if (this.onglet === onglet) return;

    this.onglet = onglet;
    this.page = 1;
    this.searchCtrl.setValue('', { emitEvent: false });
    this.loadData();
  }

  loadData(): void {
    this.loading = true;

    const search = (this.searchCtrl.value ?? '').trim();

    // Les deux appels renvoient des Observables de types differents : on les
    // ramene a `unknown` pour n'ecrire qu'une seule fois la souscription,
    // seul l'effet de bord (remplissage des signaux du service) nous importe.
    const requete: Observable<unknown> =
      this.onglet === 'inscription'
        ? this.financeService.getPaiements(this.page, this.perPage, search)
        : this.financeService.getFacturesMensualite(
            this.page,
            this.perPage,
            search
          );

    requete.subscribe({
      next: () => (this.loading = false),
      error: () => {
        this.loading = false;
        this.notificationService.error('Erreur lors du chargement des paiements');
      }
    });
  }

  onPageChange(event: PageEvent): void {
    this.page = event.pageIndex + 1;
    this.perPage = event.pageSize;
    this.loadData();
  }

  /** Le total affiche suit l'onglet courant. */
  get metaCourant(): PaginationMeta {
    return this.onglet === 'inscription' ? this.meta() : this.facturesMeta();
  }

  get listeVide(): boolean {
    return this.onglet === 'inscription'
      ? this.paiements().length === 0
      : this.factures().length === 0;
  }

  // ─── Mensualités ─────────────────────────────────────────────────────────────

  moisLabel(f: FactureMensualite): string {
    const nombre = f.nombre_mois ?? f.lignes?.length ?? 0;

    return `${nombre} mois réglé${nombre > 1 ? 's' : ''}`;
  }

  modeLabelFacture(f: FactureMensualite): string {
    return (
      MODES_PAIEMENT.find((m) => m.value === f.mode_paiement)?.label ??
      f.mode_paiement
    );
  }

  /**
   * Justificatif d'un encaissement de mensualites : un seul PDF pour toute la
   * facture, detaillant chaque mois regle.
   */
  telechargerFacture(f: FactureMensualite): void {
    if (this.downloadingFactureId !== null) return;
    this.downloadingFactureId = f.id;

    this.financeService.downloadFacturePdf(f.id).subscribe({
      next: (blob) => {
        this.downloadingFactureId = null;
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `recu-mensualites-${f.numero_facture}.pdf`;
        a.click();
        window.URL.revokeObjectURL(url);
      },
      error: () => {
        this.downloadingFactureId = null;
        this.notificationService.error(
          'Erreur lors de la génération du justificatif PDF'
        );
      }
    });
  }

  modeLabel(p: PaiementInscription): string {
    return MODES_PAIEMENT.find((m) => m.value === p.mode_paiement)?.label ?? p.mode_paiement;
  }

  // ─── Renvoi WhatsApp ─────────────────────────────────────────────────────────

  renvoyerRecuWhatsapp(p: PaiementInscription): void {
    this.renvoyerWhatsapp(
      `inscription-${p.id}`,
      this.financeService.envoyerRecuInscriptionWhatsapp(p.id)
    );
  }

  renvoyerFactureWhatsapp(f: FactureMensualite): void {
    this.renvoyerWhatsapp(
      `facture-${f.id}`,
      this.financeService.envoyerFactureWhatsapp(f.id)
    );
  }

  /**
   * Le serveur dit pourquoi l'envoi est impossible (WhatsApp non configuré,
   * tuteur sans numéro valide) : son message est affiché tel quel.
   */
  private renvoyerWhatsapp(
    cle: string,
    requete: Observable<{ message: string }>
  ): void {
    if (this.envoiWhatsapp !== null) return;
    this.envoiWhatsapp = cle;

    requete.subscribe({
      next: (res) => {
        this.envoiWhatsapp = null;
        this.notificationService.success(res.message);
      },
      error: (err) => {
        this.envoiWhatsapp = null;
        this.notificationService.error(
          err?.error?.message ?? "L'envoi WhatsApp a échoué."
        );
      }
    });
  }

  // ─── Justificatif ────────────────────────────────────────────────────────────

  /**
   * Le libellé du bouton suit le statut persisté par le backend, qui fait foi :
   * tant que l'inscription n'est pas PAYE, le justificatif est une décharge.
   * Le backend refait le calcul à la génération du PDF.
   */
  estSolde(p: PaiementInscription): boolean {
    return p.inscription?.statut_paiement === 'PAYE';
  }

  libelleDocument(p: PaiementInscription): string {
    return this.estSolde(p) ? 'Reçu de paiement' : 'Décharge';
  }

  /** Télécharge le justificatif (reçu ou décharge selon le solde). */
  telechargerRecu(p: PaiementInscription): void {
    if (this.downloadingId !== null) return;
    this.downloadingId = p.id;

    this.financeService.downloadRecuInscriptionPdf(p.id).subscribe({
      next: (blob) => {
        this.downloadingId = null;
        const prefixe = this.estSolde(p) ? 'recu' : 'decharge';
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${prefixe}-${p.numero_recu}.pdf`;
        a.click();
        window.URL.revokeObjectURL(url);
      },
      error: () => {
        this.downloadingId = null;
        this.notificationService.error(
          'Erreur lors de la génération du justificatif PDF'
        );
      }
    });
  }
}
