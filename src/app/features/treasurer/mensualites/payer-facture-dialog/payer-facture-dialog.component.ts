import { CommonModule } from '@angular/common';
import { Component, Inject, computed, inject, signal } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators
} from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatNativeDateModule } from '@angular/material/core';
import { MatDatepickerModule } from '@angular/material/datepicker';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef
} from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';
import { FinanceTresorierService } from 'src/app/auth/services/finance-tresorier.service';
import { NotificationService } from 'src/app/auth/services/Notification.service';
import { Inscription } from 'src/app/interfaces/Inscription';
import {
  FactureMensualite,
  LigneFacturePayload,
  Mensualite,
  MOIS_FR
} from 'src/app/interfaces/Mensualite';
import { MODES_PAIEMENT } from 'src/app/interfaces/Paiement';
import { toApiDate } from '../../../manager/eleve/eleve-form.utils';

export type ModeRepartition = 'AUTOMATIQUE' | 'SELECTION';

/** Ligne d'aperçu : ce qu'un mois recevra si le versement est validé tel quel. */
export interface ApercuLigne {
  mensualite: Mensualite;
  libelle: string;
  reste: number;
  impute: number;
  soldeApres: boolean;
}

export interface PayerFactureDialogData {
  inscription: Inscription;
}

/**
 * Encaissement de plusieurs mois sur une seule facture.
 *
 * Mode automatique : le trésorier saisit ce que le parent lui remet et le
 * dialogue montre, avant validation, quels mois seront soldés et lequel
 * recevra l'avance — 50 000 pour une mensualité de 20 000 solde deux mois et
 * avance 10 000 sur le troisième. Mode sélection : le trésorier coche les mois
 * et ajuste au besoin le montant imputé sur chacun.
 *
 * Dans les deux cas, une seule facture et un seul PDF en sortie.
 */
@Component({
  selector: 'vex-payer-facture-dialog',
  templateUrl: './payer-facture-dialog.component.html',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatButtonModule,
    MatButtonToggleModule,
    MatCheckboxModule,
    MatDialogModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatTooltipModule
  ]
})
export class PayerFactureDialogComponent {
  private readonly fb = inject(FormBuilder);
  private readonly dialogRef =
    inject<MatDialogRef<PayerFactureDialogComponent, boolean>>(MatDialogRef);
  private readonly financeService = inject(FinanceTresorierService);
  private readonly notificationService = inject(NotificationService);

  readonly modesPaiement = MODES_PAIEMENT;
  readonly maxDate = new Date();

  readonly inscription: Inscription;

  /** Mois non soldés, du plus ancien au plus récent : l'ordre d'imputation. */
  readonly moisAPayer: Mensualite[];
  readonly resteTotal: number;

  readonly mode = signal<ModeRepartition>('AUTOMATIQUE');

  /** Montant saisi en mode automatique, reflété pour recalculer l'aperçu. */
  private readonly montantSaisi = signal(0);

  /** Montants imputés par mois en mode sélection ; absent = mois décoché. */
  private readonly selection = signal<Map<number, number>>(new Map());

  loading = false;
  downloading = false;

  /** Facture émise : tant qu'elle existe, on propose l'impression. */
  facture: FactureMensualite | null = null;

  form: FormGroup;

  constructor(@Inject(MAT_DIALOG_DATA) public data: PayerFactureDialogData) {
    this.inscription = data.inscription;

    this.moisAPayer = (this.inscription.mensualites ?? [])
      .filter((m) => this.resteDe(m) > 0)
      .sort((a, b) => a.annee - b.annee || a.mois - b.mois);

    this.resteTotal = this.moisAPayer.reduce((s, m) => s + this.resteDe(m), 0);

    this.form = this.fb.group({
      montant: [
        this.resteTotal,
        [Validators.required, Validators.min(1), Validators.max(this.resteTotal)]
      ],
      mode_paiement: ['ESPECES', [Validators.required]],
      numero_transaction: ['', [Validators.maxLength(100)]],
      date_paiement: [new Date() as Date | null]
    });

    this.montantSaisi.set(this.resteTotal);

    this.form.get('montant')?.valueChanges.subscribe((v) => {
      this.montantSaisi.set(Number(v) || 0);
    });
  }

  // ─── Aperçu de la répartition ───────────────────────────────────────────────

  /**
   * Ce que la facture contiendra si elle est validée maintenant. En automatique
   * on reproduit la cascade du serveur pour que le trésorier voie le résultat
   * avant d'encaisser ; en sélection on reprend les montants cochés.
   */
  readonly apercu = computed<ApercuLigne[]>(() => {
    if (this.mode() === 'SELECTION') {
      const choisis = this.selection();

      return this.moisAPayer
        .filter((m) => choisis.has(m.id))
        .map((m) => {
          const impute = choisis.get(m.id) ?? 0;
          const reste = this.resteDe(m);

          return {
            mensualite: m,
            libelle: this.libelle(m),
            reste,
            impute,
            soldeApres: impute >= reste
          };
        });
    }

    let restant = this.montantSaisi();
    const lignes: ApercuLigne[] = [];

    for (const m of this.moisAPayer) {
      if (restant <= 0) break;

      const reste = this.resteDe(m);
      const impute = Math.min(restant, reste);

      lignes.push({
        mensualite: m,
        libelle: this.libelle(m),
        reste,
        impute,
        soldeApres: impute >= reste
      });

      restant -= impute;
    }

    return lignes;
  });

  /** Total de la facture : somme réellement imputée, tous modes confondus. */
  readonly totalFacture = computed(() =>
    this.apercu().reduce((s, l) => s + l.impute, 0)
  );

  readonly nbMoisSoldes = computed(
    () => this.apercu().filter((l) => l.soldeApres).length
  );

  /** Mois qui ne reçoit qu'une avance : au plus un, en fin de cascade. */
  readonly ligneAvance = computed(
    () => this.apercu().find((l) => !l.soldeApres) ?? null
  );

  readonly resteApres = computed(() => this.resteTotal - this.totalFacture());

  // ─── Mode ───────────────────────────────────────────────────────────────────

  changerMode(mode: ModeRepartition): void {
    this.mode.set(mode);

    // Passer en sélection sans rien cocher afficherait une facture vide : on
    // reprend la répartition que le montant saisi produisait, comme point de
    // départ que le trésorier peut ensuite ajuster.
    if (mode === 'SELECTION' && this.selection().size === 0) {
      const depart = new Map<number, number>();

      let restant = this.montantSaisi();
      for (const m of this.moisAPayer) {
        if (restant <= 0) break;
        const impute = Math.min(restant, this.resteDe(m));
        depart.set(m.id, impute);
        restant -= impute;
      }

      this.selection.set(depart);
    }
  }

  // ─── Sélection des mois ─────────────────────────────────────────────────────

  estCoche(m: Mensualite): boolean {
    return this.selection().has(m.id);
  }

  basculerMois(m: Mensualite, coche: boolean): void {
    const suivant = new Map(this.selection());

    // Cocher un mois l'ajoute pour son reste entier : le cas courant est de
    // solder le mois, l'ajustement partiel reste possible ensuite.
    if (coche) suivant.set(m.id, this.resteDe(m));
    else suivant.delete(m.id);

    this.selection.set(suivant);
  }

  montantDe(m: Mensualite): number {
    return this.selection().get(m.id) ?? 0;
  }

  /** Ajuste le montant imputé sur un mois, borné à son reste dû. */
  changerMontant(m: Mensualite, valeur: string | number): void {
    const brut = Number(valeur) || 0;
    const borne = Math.max(0, Math.min(brut, this.resteDe(m)));

    const suivant = new Map(this.selection());

    if (borne <= 0) suivant.delete(m.id);
    else suivant.set(m.id, borne);

    this.selection.set(suivant);
  }

  toutCocher(): void {
    const tout = new Map<number, number>();
    for (const m of this.moisAPayer) tout.set(m.id, this.resteDe(m));
    this.selection.set(tout);
  }

  toutDecocher(): void {
    this.selection.set(new Map());
  }

  // ─── Validation ─────────────────────────────────────────────────────────────

  get peutValider(): boolean {
    if (this.loading || this.facture) return false;
    if (this.form.get('mode_paiement')?.invalid) return false;

    return this.mode() === 'SELECTION'
      ? this.totalFacture() > 0
      : this.form.get('montant')?.valid === true && this.montantSaisi() > 0;
  }

  onSubmit(): void {
    if (!this.peutValider) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading = true;
    const raw = this.form.value;

    const lignes: LigneFacturePayload[] = this.apercu().map((l) => ({
      mensualite_id: l.mensualite.id,
      montant: l.impute
    }));

    this.financeService
      .payerFactureMensualites(this.inscription.id, {
        mode_repartition: this.mode(),
        montant: this.mode() === 'AUTOMATIQUE' ? this.montantSaisi() : null,
        lignes: this.mode() === 'SELECTION' ? lignes : undefined,
        mode_paiement: raw.mode_paiement,
        numero_transaction: raw.numero_transaction?.trim() || null,
        date_paiement: toApiDate(raw.date_paiement)
      })
      .subscribe({
        next: (res) => {
          this.loading = false;
          this.notificationService.success(res.message);

          // On garde le dialogue ouvert : la facture unique est justement là
          // pour être imprimée en une fois, dans la foulée de l'encaissement.
          this.facture = res.payload ?? null;

          if (!this.facture) this.dialogRef.close(true);
        },
        error: (err) => {
          this.loading = false;
          this.notificationService.error(
            err?.error?.message ?? "Erreur lors de l'encaissement de la facture"
          );
        }
      });
  }

  /** Télécharge le justificatif unique couvrant tous les mois réglés. */
  imprimerFacture(): void {
    if (!this.facture || this.downloading) return;
    this.downloading = true;

    this.financeService.downloadFacturePdf(this.facture.id).subscribe({
      next: (blob) => {
        this.downloading = false;
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `facture-${this.facture!.numero_facture}.pdf`;
        a.click();
        window.URL.revokeObjectURL(url);
      },
      error: () => {
        this.downloading = false;
        this.notificationService.error(
          'Erreur lors de la génération de la facture PDF'
        );
      }
    });
  }

  terminer(): void {
    this.dialogRef.close(true);
  }

  onCancel(): void {
    // Une facture déjà encaissée ne s'annule pas : on ferme en rafraîchissant.
    this.dialogRef.close(this.facture !== null);
  }

  // ─── Libellés ───────────────────────────────────────────────────────────────

  libelle(m: Mensualite): string {
    return `${MOIS_FR[m.mois] ?? m.mois} ${m.annee}`;
  }

  resteDe(m: Mensualite): number {
    return m.reste ?? m.montant_mensualite;
  }
}
