import { CommonModule } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';

import { WhatsappService } from 'src/app/auth/services/whatsapp.service';
import { StatutWhatsapp } from 'src/app/interfaces/Relance';

/**
 * Voyant de la liaison WhatsApp.
 *
 * Les reçus et les relances partent en silence : quand la session se
 * déconnecte, rien ne le signale avant qu'une famille ne se plaigne. Ce voyant
 * le rend visible dès le tableau de bord.
 *
 * Un clic relance la vérification — utile juste après avoir rescanné le QR
 * code. Si l'état ne peut pas être lu, le voyant s'efface : il ne doit jamais
 * gêner l'écran qui l'accueille.
 */
@Component({
  selector: 'vex-statut-whatsapp',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatIconModule, MatTooltipModule],
  template: `
    <button *ngIf="statut() as s" type="button" (click)="verifier()"
      [disabled]="verification()"
      [matTooltip]="s.message + ' Cliquez pour revérifier.'"
      class="px-3 py-1.5 rounded-full border flex items-center gap-2 caption font-medium whitespace-nowrap"
      [ngClass]="classes(s)">
      <span class="w-2 h-2 rounded-full flex-none" [ngClass]="pastille(s)"></span>
      {{ libelle(s) }}
    </button>
  `
})
export class StatutWhatsappComponent implements OnInit {
  private readonly whatsapp = inject(WhatsappService);

  readonly statut = signal<StatutWhatsapp | null>(null);
  readonly verification = signal(false);

  ngOnInit(): void {
    this.verifier();
  }

  verifier(): void {
    if (this.verification()) return;
    this.verification.set(true);

    this.whatsapp.getStatut().subscribe({
      next: (statut) => {
        this.statut.set(statut);
        this.verification.set(false);
      },
      error: () => {
        this.statut.set(null);
        this.verification.set(false);
      }
    });
  }

  libelle(s: StatutWhatsapp): string {
    switch (s.etat) {
      case 'connecte':
        return s.numero ? `WhatsApp connecté (+${s.numero})` : 'WhatsApp connecté';
      case 'deconnecte':
        return 'WhatsApp déconnecté';
      case 'injoignable':
        return 'WhatsApp injoignable';
      default:
        return 'WhatsApp non configuré';
    }
  }

  classes(s: StatutWhatsapp): string {
    switch (s.etat) {
      case 'connecte':
        return 'bg-green-50 border-green-200 text-green-800';
      case 'non_configure':
        return 'bg-gray-50 border-gray-200 text-gray-700';
      default:
        return 'bg-red-50 border-red-200 text-red-800';
    }
  }

  pastille(s: StatutWhatsapp): string {
    switch (s.etat) {
      case 'connecte':
        return 'bg-green-600';
      case 'non_configure':
        return 'bg-gray-400';
      default:
        return 'bg-red-600';
    }
  }
}
