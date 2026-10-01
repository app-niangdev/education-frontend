import { CommonModule } from '@angular/common';
import {
  booleanAttribute,
  Component,
  EventEmitter,
  Input,
  Output
} from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatTooltipModule } from '@angular/material/tooltip';

/**
 * Ligne standard d'une liste : carte empilée sur mobile, ligne alignée sur
 * grand écran. Zones projetées :
 *  - contenu principal (par défaut) ;
 *  - `[badge]` : badge(s) — toujours alignés à droite ;
 *  - `[secondaire]` : autres infos/valeurs alignées à droite (montant…) ;
 *  - `[actions]` : actions personnalisées supplémentaires.
 *
 * Les actions courantes **Modifier / Supprimer** sont gérées par le composant :
 * activées via `avecModifier` / `avecSupprimer`, elles s'affichent en **icônes
 * sur desktop** et se replient dans un **menu ⋮ sur mobile**.
 */
@Component({
  selector: 'vex-liste-ligne',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatIconModule,
    MatMenuModule,
    MatTooltipModule
  ],
  templateUrl: './liste-ligne.component.html'
})
export class ListeLigneComponent {
  /** Classes CSS additionnelles sur la ligne (ex. surbrillance conditionnelle). */
  @Input() ligneClass = '';

  /**
   * Force l'affichage de l'action. Laissé indéfini, l'action apparaît
   * automatiquement dès que l'événement correspondant est écouté. Utile pour
   * les cas conditionnels (ex. `[avecSupprimer]="!isSupervisor"`).
   */
  @Input({ transform: booleanAttribute }) avecModifier?: boolean;
  @Input({ transform: booleanAttribute }) avecSupprimer?: boolean;
  @Input() labelModifier = 'Modifier';
  @Input() labelSupprimer = 'Supprimer';

  @Output() modifier = new EventEmitter<void>();
  @Output() supprimer = new EventEmitter<void>();

  /** Affiche « Modifier » si forcé, sinon si l'événement est écouté. */
  get afficheModifier(): boolean {
    return this.avecModifier ?? this.modifier.observed;
  }

  get afficheSupprimer(): boolean {
    return this.avecSupprimer ?? this.supprimer.observed;
  }

  get aDesActionsStandard(): boolean {
    return this.afficheModifier || this.afficheSupprimer;
  }

  onModifier(event: Event): void {
    event.stopPropagation();
    this.modifier.emit();
  }

  onSupprimer(event: Event): void {
    event.stopPropagation();
    this.supprimer.emit();
  }
}
