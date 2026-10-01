import { Component, inject } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { AuthService } from 'src/app/auth/services/auth.service';

/** Ce qu'on voit tant qu'aucun fil n'est ouvert. */
@Component({
  selector: 'vex-messagerie-vide',
  standalone: true,
  imports: [MatIconModule],
  template: `
    <div
      class="h-full flex flex-col items-center justify-center text-center p-8 gap-3">
      <div
        class="w-16 h-16 rounded-full bg-primary-100 dark:bg-primary-700/20 flex items-center justify-center">
        <mat-icon
          class="text-primary-600 dark:text-primary-300"
          svgIcon="mat:forum"></mat-icon>
      </div>

      <div class="text-lg font-medium">Aucune conversation sélectionnée</div>

      <div class="text-sm text-gray-500 max-w-sm">
        {{
          estTuteur
            ? 'Choisissez une demande dans la liste, ou écrivez à la scolarité ou à la trésorerie.'
            : 'Choisissez une demande dans la liste pour la traiter.'
        }}
      </div>
    </div>
  `
})
export class MessagerieVideComponent {
  private readonly authService = inject(AuthService);

  readonly estTuteur = this.authService.getRole() === 'tuteur';
}
