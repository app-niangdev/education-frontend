import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';
import { MenuItem } from '../interfaces/menu-item.interface';
import { trackById } from '@vex/utils/track-by';
import { VexPopoverRef } from '@vex/components/vex-popover/vex-popover-ref';
import { RouterLink } from '@angular/router';
import { MatRippleModule } from '@angular/material/core';
import { NgClass, NgFor } from '@angular/common';
import { MatMenuModule } from '@angular/material/menu';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { AuthService } from 'src/app/auth/services/auth.service';
import { UserFromToken } from 'src/app/interfaces/Auth';

@Component({
  selector: 'vex-toolbar-user-dropdown',
  templateUrl: './toolbar-user-dropdown.component.html',
  styleUrls: ['./toolbar-user-dropdown.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [
    MatIconModule,
    MatButtonModule,
    MatTooltipModule,
    MatMenuModule,
    NgFor,
    NgClass,
    MatRippleModule,
    RouterLink
  ]
})
export class ToolbarUserDropdownComponent implements OnInit {
  items: MenuItem[] = [
    {
      id: '1',
      icon: 'mat:person',
      label: 'Mon Profil',
      description: 'Informations personnelles',
      colorClass: 'text-teal-600',
      route: '/index/profile'
    }
  ];

  trackById = trackById;
  userConnect: UserFromToken | null = null;

  constructor(
    private popoverRef: VexPopoverRef<ToolbarUserDropdownComponent>,
    private authService: AuthService
  ) {
    this.userConnect = authService.getCurrentUserSync();
  }

  ngOnInit() {}

  close() {
    this.popoverRef.close();
  }

  logout() {
    this.authService.logout();
    this.popoverRef.close();
  }
}
