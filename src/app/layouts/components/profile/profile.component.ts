import { NgFor } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { RouterLinkActive, RouterLink, RouterOutlet } from '@angular/router';
import { fadeInRight400ms } from '@vex/animations/fade-in-right.animation';
import { scaleIn400ms } from '@vex/animations/scale-in.animation';
import { MatTabsModule } from '@angular/material/tabs';
import { Link } from '@vex/interfaces/link.interface';
import { AuthService } from 'src/app/auth/services/auth.service';
import { UserFromToken } from 'src/app/interfaces/Auth';
import { Subscription } from 'rxjs';

@Component({
  selector: 'vex-profile',
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.scss'],
  animations: [scaleIn400ms, fadeInRight400ms],
  standalone: true,
  imports: [MatTabsModule, NgFor, RouterLinkActive, RouterLink, RouterOutlet]
})
export class ProfileComponent implements OnInit, OnDestroy {
  links: Link[] = [
    {
      label: 'Informations Personnelles',
      route: './',
      routerLinkActiveOptions: { exact: true }
    },
    {
      label: 'Sécurité',
      route: './security'
    }
  ];

  userConnect: UserFromToken | null = null;
  private sub?: Subscription;

  constructor(private authService: AuthService) {}

  ngOnInit() {
    this.sub = this.authService.user$.subscribe((u) => (this.userConnect = u));
    this.authService.getMe().subscribe();
  }

  ngOnDestroy() {
    this.sub?.unsubscribe();
  }
}
