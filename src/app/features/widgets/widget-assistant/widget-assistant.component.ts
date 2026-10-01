import { CommonModule, NgIf } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { AuthService } from 'src/app/auth/services/auth.service';
import { UserFromToken } from 'src/app/interfaces/Auth';

@Component({
  selector: 'vex-widget-assistant',
  templateUrl: './widget-assistant.component.html',
  styleUrls: ['./widget-assistant.component.scss'],
  standalone: true,
  imports: [MatIconModule,NgIf, CommonModule]
})
export class WidgetAssistantComponent implements OnInit {
  currentUser: UserFromToken | null = null;
  constructor(private authService: AuthService) {}

  ngOnInit() {
    this.currentUser = this.authService.getCurrentUserSync();
  }

  translateRoleName(roleName: string, gender: string): string {
    if (gender === 'male') {
      switch (roleName) {
        case 'Manager':
          return 'Directeur';
        case 'Seller':
          return 'Vendeur';
        case 'Owner':
          return 'Propriétaire';
        default:
          return roleName;
      }
    } else if (gender === 'female') {
      switch (roleName) {
        case 'Manager':
          return 'Directrice';
        case 'Seller':
          return 'Vendeuse';
        case 'Owner':
          return 'Propriétaire';
        default:
          return roleName;
      }
    }
    return roleName; // Retour par défaut si le genre n'est pas spécifié
  }
}
