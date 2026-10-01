import { NgIf } from '@angular/common';
import { Component, inject, Input, OnInit, signal } from '@angular/core';
import { EtablissementService } from 'src/app/auth/services/etablissement.service';

/**
 * Affiche le logo de l'établissement sur les pages publiques (auth).
 * Retombe sur le logo statique tant que l'API n'a pas répondu,
 * si aucun logo n'est enregistré, ou si le chargement de l'image échoue.
 */
@Component({
  selector: 'vex-etablissement-logo',
  standalone: true,
  template: `
    <img
      *ngIf="logoUrl() as src"
      [class]="imgClass"
      [src]="src"
      [alt]="alt"
      (error)="onImageError()" />
  `,
  imports: [NgIf]
})
export class EtablissementLogoComponent implements OnInit {
  private readonly etablissementService = inject(EtablissementService);

  /** Classes Tailwind appliquées à l'image (taille variable selon la page). */
  @Input() imgClass = 'w-36 sm:w-36';
  @Input() alt = 'Logo';

  private readonly fallback = 'assets/img/logo/logo.jpeg';
  // null tant que l'URL finale n'est pas connue : on n'affiche rien pour éviter
  // le clignotement du logo par défaut avant le vrai logo.
  private readonly url = signal<string | null>(null);
  readonly logoUrl = this.url.asReadonly();

  ngOnInit(): void {
    const cached = this.etablissementService.etablissement();
    if (cached) {
      // Données déjà chargées : on affiche directement le bon logo (ou le secours).
      this.url.set(cached.logo || this.fallback);
      return;
    }

    this.etablissementService.getInfoEtablissement().subscribe({
      next: (etablissement) => this.url.set(etablissement?.logo || this.fallback),
      // L'erreur est déjà tracée par le service : on retombe sur le secours.
      error: () => this.url.set(this.fallback)
    });
  }

  onImageError(): void {
    if (this.url() !== this.fallback) this.url.set(this.fallback);
  }
}
