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
import {
  Mensualite,
  MOIS_FR,
  PaiementMensualite
} from 'src/app/interfaces/Mensualite';
import { MODES_PAIEMENT } from 'src/app/interfaces/Paiement';
import { toApiDate } from '../../../manager/eleve/eleve-form.utils';

export interface PayerMensualiteDialogData {
  mensualite: Mensualite;
}

@Component({
  selector: 'vex-payer-mensualite-dialog',
  templateUrl: './payer-mensualite-dialog.component.html',
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
export class PayerMensualiteDialogComponent {
  private readonly fb = inject(FormBuilder);
  private readonly dialogRef =
    inject<MatDialogRef<PayerMensualiteDialogComponent, boolean>>(MatDialogRef);
  private readonly financeService = inject(FinanceTresorierService);
  private readonly notificationService = inject(NotificationService);

  readonly modesPaiement = MODES_PAIEMENT;
  readonly maxDate = new Date();

  loading = false;
  downloading = false;

  /**
   * Versement encaissé : renseigné après succès, il fait basculer le dialogue
   * sur l'écran d'impression du justificatif.
   */
  paiementEncaisse: PaiementMensualite | null = null;

  /** Le versement a-t-il soldé le mois ? Détermine reçu vs décharge. */
  soldee = false;

  readonly mensualite: Mensualite;
  readonly reste: number;
  readonly dejaPaye: number;

  form: FormGroup;

  constructor(@Inject(MAT_DIALOG_DATA) public data: PayerMensualiteDialogData) {
    this.mensualite = data.mensualite;
    this.dejaPaye = this.mensualite.total_paye ?? 0;
    this.reste = this.mensualite.reste ?? this.mensualite.montant_mensualite;

    this.form = this.fb.group({
      // Par défaut on propose le solde complet, plafonné au reste à payer.
      montant: [
        this.reste,
        [Validators.required, Validators.min(1), Validators.max(this.reste)]
      ],
      mode_paiement: ['ESPECES', [Validators.required]],
      numero_transaction: ['', [Validators.maxLength(100)]],
      date_paiement: [new Date() as Date | null]
    });
  }

  /** Libellé « Octobre 2026 » de la mensualité. */
  get libelleMois(): string {
    return `${MOIS_FR[this.mensualite.mois] ?? this.mensualite.mois} ${this.mensualite.annee}`;
  }

  /** Un versement inférieur au reste laisse la mensualité partiellement payée. */
  get partiel(): boolean {
    const montant = Number(this.form.get('montant')?.value ?? 0);
    return montant > 0 && montant < this.reste;
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading = true;
    const raw = this.form.value;

    this.financeService
      .payerMensualite(this.mensualite.id, {
        montant: Number(raw.montant),
        mode_paiement: raw.mode_paiement,
        numero_transaction: raw.numero_transaction?.trim() || null,
        date_paiement: toApiDate(raw.date_paiement)
      })
      .subscribe({
        next: (res) => {
          this.loading = false;
          this.notificationService.success(res.message);

          // On ne ferme pas tout de suite : le trésorier doit pouvoir imprimer
          // le justificatif du versement qu'il vient d'encaisser.
          const mensualite = res.payload;
          this.paiementEncaisse = mensualite?.paiement_cree ?? null;
          this.soldee = (mensualite?.reste ?? 0) <= 0;

          if (!this.paiementEncaisse) this.dialogRef.close(true);
        },
        error: (err) => {
          this.loading = false;
          this.notificationService.error(
            err?.error?.message ?? 'Erreur lors de l\'encaissement de la mensualité'
          );
        }
      });
  }

  // ─── Justificatif ────────────────────────────────────────────────────────────

  get libelleDocument(): string {
    return this.soldee ? 'Reçu de paiement' : 'Décharge';
  }

  /** Télécharge le justificatif du versement qui vient d'être encaissé. */
  imprimerJustificatif(): void {
    if (!this.paiementEncaisse || this.downloading) return;
    this.downloading = true;

    const paiement = this.paiementEncaisse;

    this.financeService.downloadRecuMensualitePdf(paiement.id).subscribe({
      next: (blob) => {
        this.downloading = false;
        const prefixe = this.soldee ? 'recu' : 'decharge';
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${prefixe}-${paiement.numero_recu}.pdf`;
        a.click();
        window.URL.revokeObjectURL(url);
      },
      error: () => {
        this.downloading = false;
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
    this.dialogRef.close(this.paiementEncaisse !== null);
  }
}
