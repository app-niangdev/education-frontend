import { Component, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { VexConfigService } from '@vex/config/vex-config.service';
import { AuthService } from './auth/services/auth.service';
import { ThemeColorService } from './auth/services/theme-color.service';
import { NavigationInitializerService } from './core/navigation/NavigationInitializerService';

@Component({
  selector: 'vex-root',
  templateUrl: './app.component.html',
  standalone: true,
  imports: [RouterOutlet]
})
export class AppComponent implements OnInit {
  constructor(
    private navigationInitializer: NavigationInitializerService,
    private authService: AuthService,
    // Instancie le service de config vex des le demarrage pour que la classe
    // de theme (et donc les variables --vex-color-primary-*) soit toujours
    // presente sur <body>, y compris sur les pages publiques comme la home.
    private vexConfigService: VexConfigService,
    // Instancie le service de couleur des le demarrage : son constructeur
    // reapplique la couleur du localStorage sur TOUTES les routes (y compris
    // la page de maintenance, hors LayoutComponent).
    private themeColorService: ThemeColorService
  ) {}

  ngOnInit() {
    this.navigationInitializer.initializeNavigation();

    // Rafraichit l'utilisateur et ses menus depuis le serveur au demarrage.
    // Fait ici (et non dans le constructeur d'AuthService) car la DI est alors
    // entierement resolue : declencher un appel HTTP plus tot creerait une
    // dependance circulaire avec les intercepteurs (NG0200).
    this.authService.refreshCurrentUser();

    // Note : la couleur primaire est appliquee via ThemeColorService
    // (localStorage au demarrage) + getInfoEtablissement (endpoint public).
    // Inutile d'appeler getParametrage ici (endpoint protege, redondant).
  }
}
