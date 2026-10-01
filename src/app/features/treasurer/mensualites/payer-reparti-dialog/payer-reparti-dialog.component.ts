import { CommonModule } from '@angular/common';
import { Component, Inject, inject } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators
} from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
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
import { FinanceTresorierService } from 'src/app/auth/services/finance-tresorier.service';
import { NotificationService } from 'src/app/auth/services/Notification.service';
import { Inscription } from 'src/app/interfaces/Inscription';
import { MOIS_FR, PaiementMensualite } from 'src/app/interfaces/Mensualite';
import { MODES_PAIEMENT } from 'src/app/interfaces/Paiement';
import { toApiDate } from '../../../manager/eleve/eleve-form.utils';

/**
 * Justificatif à imprimer pour un des mois touchés par le versement réparti :
 * un reçu si le mois est soldé, une décharge s'il reste un solde exigible.
 */
export interface JustificatifReparti {
  paiement: PaiementMensualite;
  libelleMois: string;
  soldee: boolean;
}

export interface PayerRepartiDialogData {
  inscription: Inscription;
  resteTotal: number;
}

@Component({
  selector: 'vex-payer-reparti-dialog',
  templateUrl: './payer-reparti-dialog.component.html',
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
    MatDialogModule,
    MatIconModule,
    MatProgressSpinnerModule
  ]
})
export class PayerRepartiDialogComponent {
  private readonly fb = inject(FormBuilder);
  private readonly dialogRef =
    inject<MatDialogRef<PayerRepartiDialogComponent, boolean>>(MatDialogRef);
  private readonly financeService = inject(FinanceTresorierService);
  private readonly notificationService = inject(NotificationService);

  readonly modesPaiement = MODES_PAIEMENT;
  readonly maxDate = new Date();

  loading = false;

  /** Id du paiement dont le justificatif est en cours de génération. */
  downloadingId: number | null = null;

  /**
   * Justificatifs générés par le versement : un versement réparti touche
   * plusieurs mois et produit donc un document par mois concerné.
   */
  justificatifs: JustificatifReparti[] = [];

  readonly inscription: Inscription;
  readonly resteTotal: number;

  form: FormGroup;

  constructor(@Inject(MAT_DIALOG_DATA) public data: PayerRepartiDialogData) {
    this.inscription = data.inscription;
    this.resteTotal = data.resteTotal;

    this.form = this.fb.group({
      montant: [
        this.resteTotal,
        [Validators.required, Validators.min(1), Validators.max(this.resteTotal)]
      ],
      mode_paiement: ['ESPECES', [Validators.required]],
      numero_transaction: ['', [Validators.maxLength(100)]],
      date_paiement: [new Date() as Date | null]
    });
  }

  /** Nombre de mois entièrement soldés par le montant saisi (aperçu). */
  get moisSoldes(): number {
    const montant = Number(this.form.get('montant')?.value ?? 0);
    const mensualite = this.inscription.mensualites?.[0]?.montant_mensualite ?? 0;
    if (mensualite <= 0) return 0;
    return Math.floor(montant / mensualite);
  }

  get soldeTout(): boolean {
    return Number(this.form.get('montant')?.value ?? 0) >= this.resteTotal;
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading = true;
    const raw = this.form.value;

    this.financeService
      .payerMensualitesReparti(this.inscription.id, {
        montant: Number(raw.montant),
        mode_paiement: raw.mode_paiement,
        numero_transaction: raw.numero_transaction?.trim() || null,
        date_paiement: toApiDate(raw.date_paiement)
      })
      .subscribe({
        next: (res) => {
          this.loading = false;
          this.notificationService.success(res.message);

          // On ne ferme pas tout de suite : chaque mois touché a son propre
          // reçu, le trésorier doit pouvoir les imprimer un à un.
          this.justificatifs = this.construireJustificatifs(res.payload);

          if (this.justificatifs.length === 0) this.dialogRef.close(true);
        },
        error: (err) => {
          this.loading = false;
          this.notificationService.error(
            err?.error?.message ?? 'Erreur lors du versement réparti'
          );
        }
      });
  }

  // ─── Justificatifs ───────────────────────────────────────────────────────────

  /**
   * Associe chaque versement créé au mois qu'il a réglé, pour savoir si ce mois
   * est soldé (reçu) ou seulement entamé (décharge).
   */
  private construireJustificatifs(inscription?: Inscription): JustificatifReparti[] {
    const paiements = inscription?.paiements_crees ?? [];
    const mensualites = inscription?.mensualites ?? [];

    return paiements.map((paiement) => {
      const mois = mensualites.find((m) => m.id === paiement.mensualite_id);

      return {
        paiement,
        libelleMois: mois
          ? `${MOIS_FR[mois.mois] ?? mois.mois} ${mois.annee}`
          : 'Mensualité',
        soldee: (mois?.reste ?? 0) <= 0
      };
    });
  }

  /** Télécharge le justificatif d'un des mois réglés par le versement. */
  imprimerJustificatif(j: JustificatifReparti): void {
    if (this.downloadingId !== null) return;
    this.downloadingId = j.paiement.id;

    this.financeService.downloadRecuMensualitePdf(j.paiement.id).subscribe({
      next: (blob) => {
        this.downloadingId = null;
        const prefixe = j.soldee ? 'recu' : 'decharge';
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${prefixe}-${j.paiement.numero_recu}.pdf`;
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

  /** Ferme après encaissement : la liste doit être rechargée. */
  terminer(): void {
    this.dialogRef.close(true);
  }

  onCancel(): void {
    // Un versement déjà encaissé ne s'annule pas : on ferme en rafraîchissant.
    this.dialogRef.close(this.justificatifs.length > 0);
  }
}
