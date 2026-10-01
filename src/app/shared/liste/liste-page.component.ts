import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { fadeInRight400ms } from '@vex/animations/fade-in-right.animation';
import { scaleIn400ms } from '@vex/animations/scale-in.animation';
import { PaginationMeta } from 'src/app/response-type/Type';

/**
 * Squelette standard d'une page de liste : en-tête de page, carte, barre
 * d'outils (titre + actions + filtres projetés), états (chargement / vide) et
 * pagination. Le contenu des lignes est projeté (utiliser `vex-liste-ligne`).
 *
 * Zones projetées :
 *  - `[entete]`  : actions dans l'en-tête de page (à droite du titre) ;
 *  - `[actions]` : boutons d'action de la barre d'outils ;
 *  - `[filtres]` : champs de recherche / filtres ;
 *  - contenu par défaut : les lignes (dans un conteneur `divide-y`) ;
 *  - `[etatVide]` : contenu affiché quand la liste est vide.
 */
@Component({
  selector: 'vex-liste-page',
  standalone: true,
  animations: [scaleIn400ms, fadeInRight400ms],
  imports: [
    CommonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatPaginatorModule
  ],
  templateUrl: './liste-page.component.html'
})
export class ListePageComponent {
  /** Icône de l'en-tête (svgIcon Material, ex. `mat:group`). */
  @Input() icon = 'mat:list';
  /** Titre de la page. */
  @Input() titre = '';
  /** Titre de la carte (section liste). Optionnel. */
  @Input() titreCarte?: string;
  /** Sous-titre / description sous le titre de carte. Optionnel. */
  @Input() sousTitre?: string;

  /** Affiche l'état de chargement. */
  @Input() loading = false;
  /** Vrai quand aucune ligne à afficher (bascule sur l'état vide). */
  @Input() vide = false;
  /** Affiche la zone des filtres (masquée si aucun filtre projeté). */
  @Input() aDesFiltres = false;

  /** Métadonnées de pagination serveur ; null = pas de pagination. */
  @Input() meta: PaginationMeta | null = null;
  @Input() pageSizeOptions: number[] = [5, 10, 25, 50];

  /** Émis lors d'un changement de page/taille. */
  @Output() pageChange = new EventEmitter<PageEvent>();
}
