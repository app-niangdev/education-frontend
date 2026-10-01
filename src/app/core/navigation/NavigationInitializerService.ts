import { Injectable } from '@angular/core';
import { NavigationLoaderService } from './navigation-loader.service';
import { AuthService } from 'src/app/auth/services/auth.service';
import { distinctUntilChanged, filter, switchMap } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class NavigationInitializerService {
  constructor(
    private navigationLoader: NavigationLoaderService,
    private authService: AuthService
  ) {}

  initializeNavigation(): void {
    // Charger la navigation initiale
    this.navigationLoader.loadNavigationBasedOnRole();

    // Écouter les changements d'authentification
    // this.authService.isAuthenticated$.pipe(
    //   filter(isAuthenticated => isAuthenticated),
    //   switchMap(() => this.authService.getCurrentUser()),
    //   filter(user => user !== null),
    //   distinctUntilChanged((prev, curr) => prev?.role.name === curr?.role.name)
    // ).subscribe(() => {
    //   this.navigationLoader.refreshNavigation();
    // });
  }
}
