import { Component, inject, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { EtablissementService } from 'src/app/auth/services/etablissement.service';
import { SiteHeaderComponent } from './components/site-header/site-header.component';
import { HeroSectionComponent } from './components/hero-section/hero-section.component';
import { FeesSectionComponent } from './components/fees-section/fees-section.component';
import { ContactSectionComponent } from './components/contact-section/contact-section.component';
import { SiteFooterComponent } from './components/site-footer/site-footer.component';


@Component({
  selector: 'vex-home-page',
  standalone: true,
  imports: [
    CommonModule,
    SiteHeaderComponent,
    HeroSectionComponent,
    FeesSectionComponent,
    ContactSectionComponent,
    SiteFooterComponent,
  ],
  template: `
    <div class="min-h-screen flex flex-col">
      <app-site-header [etablissement]="etablissement()"></app-site-header>
      <main class="flex-1">
        <app-hero-section    [etablissement]="etablissement()"></app-hero-section>
        <app-fees-section></app-fees-section>
        <app-contact-section [etablissement]="etablissement()"></app-contact-section>
      </main>
      <app-site-footer [etablissement]="etablissement()"></app-site-footer>
    </div>
  `,
  styles: [`
    :host {
      display: block;
    }
  `]
})
export class HomePageComponent implements OnInit, OnDestroy {
  private readonly etablissementService = inject(EtablissementService);

  readonly etablissement = this.etablissementService.etablissement;
  ngOnInit(): void {
    this.etablissementService.getInfoEtablissement().subscribe();
    // Le layout Vex verrouille html/body + .vex-base-layout-container en position:absolute
    // On libère le scroll uniquement le temps que la landing page est active
    document.documentElement.style.setProperty('overflow', 'auto');
    document.body.style.setProperty('overflow', 'auto');
    document.body.style.setProperty('height', 'auto');
    const vexContainer = document.querySelector<HTMLElement>('.vex-base-layout-container');
    if (vexContainer) {
      vexContainer.style.setProperty('position', 'relative');
      vexContainer.style.setProperty('overflow', 'visible');
    }
  }

  ngOnDestroy(): void {
    document.documentElement.style.removeProperty('overflow');
    document.body.style.removeProperty('overflow');
    document.body.style.removeProperty('height');
    const vexContainer = document.querySelector<HTMLElement>('.vex-base-layout-container');
    if (vexContainer) {
      vexContainer.style.removeProperty('position');
      vexContainer.style.removeProperty('overflow');
    }
  }
}
