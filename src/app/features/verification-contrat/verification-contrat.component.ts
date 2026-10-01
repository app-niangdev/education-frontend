import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ContratService } from 'src/app/auth/services/contrat.service';
import { VerificationContrat } from 'src/app/interfaces/Contrat';

/**
 * La page atteinte en scannant le QR code d'un contrat imprimé.
 *
 * Elle est publique : celui qui la consulte — banque, bailleur, administration
 * — n'a pas de compte ici. Elle répond à une seule question, « ce papier
 * correspond-il à un engagement enregistré ? », et le serveur ne lui confie
 * rien d'autre : ni rémunération, ni motif de résiliation.
 */
@Component({
  selector: 'vex-verification-contrat',
  templateUrl: './verification-contrat.component.html',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    MatIconModule,
    MatButtonModule,
    MatProgressSpinnerModule
  ]
})
export class VerificationContratComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly contratService = inject(ContratService);

  loading = true;

  /** Null tant que le chargement court, et si le code ne correspond à rien. */
  contrat: VerificationContrat | null = null;

  code = '';

  ngOnInit(): void {
    this.code = this.route.snapshot.paramMap.get('code') ?? '';

    if (!this.code) {
      this.loading = false;
      return;
    }

    this.contratService.verifier(this.code).subscribe((contrat) => {
      this.contrat = contrat;
      this.loading = false;
    });
  }

  /**
   * Un contrat authentique mais échu n'est pas un faux : le distinguer évite de
   * faire passer pour contrefait un document qui a simplement fait son temps.
   */
  get authentique(): boolean {
    return this.contrat !== null;
  }

  get enVigueur(): boolean {
    return this.contrat?.est_en_vigueur === true;
  }

  formaterDate(date: string | null): string {
    return date ? new Date(date).toLocaleDateString('fr-FR') : '—';
  }

  formaterHorodatage(date: string | null): string {
    if (!date) {
      return '—';
    }

    return new Date(date).toLocaleString('fr-FR', {
      dateStyle: 'long',
      timeStyle: 'short'
    });
  }

  /** « du 01/09/2026 au 30/06/2027 », ou « depuis le … » sans terme. */
  get periode(): string {
    if (!this.contrat) {
      return '—';
    }

    const debut = this.formaterDate(this.contrat.date_debut);

    return this.contrat.date_fin
      ? `du ${debut} au ${this.formaterDate(this.contrat.date_fin)}`
      : `depuis le ${debut}`;
  }
}
