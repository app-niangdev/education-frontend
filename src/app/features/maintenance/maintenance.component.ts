import { CommonModule } from '@angular/common';
import { Component, EventEmitter, inject, Input, OnInit, Output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { Router, RouterLink } from '@angular/router';
import { EtablissementService } from 'src/app/auth/services/etablissement.service';
import { Etablissement } from 'src/app/interfaces/Etablissement';

/**
 * Page affichée quand la plateforme est en maintenance.
 *
 * Utilise les couleurs de paramétrage via les classes de thème `primary-*`
 * (variables --vex-color-primary-*), donc elle suit automatiquement la couleur
 * choisie dans les paramètres.
 *
 * NB : composant volontairement autonome, non branché à une route ni à un
 * guard pour l'instant.
 */
@Component({
  selector: 'vex-maintenance',
  standalone: true,
  imports: [CommonModule, MatIconModule, MatButtonModule, RouterLink],
  templateUrl: './maintenance.component.html'
})
export class MaintenanceComponent implements OnInit {
  private readonly etablissementService = inject(EtablissementService);
  private readonly router = inject(Router);

  /** Titre principal. */
  @Input() titre = 'Site en maintenance';

  /** Message explicatif. */
  @Input() message =
    "La plateforme est momentanément indisponible pour maintenance. Merci de revenir dans quelques instants.";

  /** Nom de l'établissement à afficher sous le message (optionnel). */
  @Input() etablissementNom?: string;

  /** Affiche un bouton « Réessayer ». */
  @Input() showRetry = false;

  /**
   * Destination du lien « Connexion administrateur » : permet à l'admin de se
   * connecter pour désactiver la maintenance.
   */
  @Input() loginLink: string | any[] = '/login';

  /** Émis au clic sur « Réessayer » (si affiché). */
  @Output() retry = new EventEmitter<void>();

  ngOnInit(): void {
    // Charge l'établissement (endpoint public) : applique la couleur de
    // paramétrage, récupère le nom, et vérifie l'état de maintenance.
    const cached = this.etablissementService.etablissement();
    if (cached) {
      this.gererStatut(cached);
      return;
    }
    this.etablissementService
      .getInfoEtablissement()
      .subscribe((etab) => this.gererStatut(etab));
  }

  /**
   * Si la maintenance a été désactivée côté back, on quitte cette page pour
   * rejoindre la navigation normale (un simple refresh ramène l'utilisateur
   * au bon endroit).
   */
  private gererStatut(etab: Etablissement | null): void {
    if (!etab?.en_maintenance) {
      this.router.navigate(['/']);
      return;
    }
    this.etablissementNom ??= etab.nom;
  }
}
