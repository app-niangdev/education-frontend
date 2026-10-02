import { CommonModule } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef
} from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';

import { FinanceTresorierService } from 'src/app/auth/services/finance-tresorier.service';
import { NotificationService } from 'src/app/auth/services/Notification.service';
import { Inscription } from 'src/app/interfaces/Inscription';
import { FactureMensualite } from 'src/app/interfaces/Mensualite';
import { MODES_PAIEMENT } from 'src/app/interfaces/Paiement';

export interface RecusMensualitesDialogData {
  inscription: Inscription;
}

/**
 * Justificatifs deja emis sur les mensualites d'un eleve.
 *
 * Repond a un manque simple : le recu d'un reglement multi-mois n'etait
 * proposé qu'au moment du paiement, dans la fenetre d'encaissement. Une fois
 * celle-ci fermee, plus rien n'y ramenait — alors qu'une famille reclame son
 * recu bien apres etre passee a la caisse, et que le document existe deja
 * cote serveur.
 *
 * Chaque ligne est une facture (FAM-xxx), pas un mois : un versement couvrant
 * cinq mois porte un seul numero et un seul justificatif, qui les detaille.
 */
@Component({
  selector: 'vex-recus-mensualites-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatDialogModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatTooltipModule
  ],
  templateUrl: './recus-mensualites-dialog.component.html'
})
export class RecusMensualitesDialogComponent implements OnInit {
  readonly data = inject<RecusMensualitesDialogData>(MAT_DIALOG_DATA);

  private readonly financeService = inject(FinanceTresorierService);
  private readonly notification = inject(NotificationService);
  private readonly dialogRef =
    inject<MatDialogRef<RecusMensualitesDialogComponent>>(MatDialogRef);

  readonly factures = signal<FactureMensualite[]>([]);
  readonly chargement = signal(true);
  readonly downloadingId = signal<number | null>(null);

  /** Id de la facture en cours de renvoi sur WhatsApp. */
  readonly envoiWhatsappId = signal<number | null>(null);

  ngOnInit(): void {
    this.charger();
  }

  /**
   * Les factures sont retrouvees par le numero d'inscription, sur lequel
   * porte deja la recherche serveur. La reponse est ensuite filtree sur
   * l'identifiant exact : une recherche textuelle pourrait ramener
   * l'inscription d'un homonyme dont le numero contient celui-ci.
   */
  private charger(): void {
    const inscription = this.data.inscription;

    this.financeService
      .getFacturesMensualite(1, 100, inscription.numero_inscription)
      .subscribe({
        next: (factures) => {
          this.factures.set(
            factures.filter((f) => f.inscription_id === inscription.id)
          );
          this.chargement.set(false);
        },
        error: () => {
          this.chargement.set(false);
          this.notification.error(
            'Erreur lors du chargement des justificatifs.'
          );
        }
      });
  }

  moisLabel(f: FactureMensualite): string {
    const nombre = f.nombre_mois ?? f.lignes?.length ?? 0;

    return `${nombre} mois réglé${nombre > 1 ? 's' : ''}`;
  }

  modeLabel(f: FactureMensualite): string {
    return (
      MODES_PAIEMENT.find((m) => m.value === f.mode_paiement)?.label ??
      f.mode_paiement
    );
  }

  telecharger(f: FactureMensualite): void {
    if (this.downloadingId() !== null) return;
    this.downloadingId.set(f.id);

    this.financeService.downloadFacturePdf(f.id).subscribe({
      next: (blob) => {
        this.downloadingId.set(null);
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `recu-mensualites-${f.numero_facture}.pdf`;
        a.click();
        window.URL.revokeObjectURL(url);
      },
      error: () => {
        this.downloadingId.set(null);
        this.notification.error(
          'Erreur lors de la génération du justificatif PDF'
        );
      }
    });
  }

  /**
   * Renvoie le justificatif au tuteur sur WhatsApp. Le serveur dit pourquoi
   * l'envoi est impossible (WhatsApp non configuré, numéro invalide) : son
   * message est affiché tel quel.
   */
  renvoyerWhatsapp(f: FactureMensualite): void {
    if (this.envoiWhatsappId() !== null) return;
    this.envoiWhatsappId.set(f.id);

    this.financeService.envoyerFactureWhatsapp(f.id).subscribe({
      next: (res) => {
        this.envoiWhatsappId.set(null);
        this.notification.success(res.message);
      },
      error: (err) => {
        this.envoiWhatsappId.set(null);
        this.notification.error(
          err?.error?.message ?? "L'envoi WhatsApp a échoué."
        );
      }
    });
  }

  fermer(): void {
    this.dialogRef.close();
  }
}
