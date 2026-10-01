import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Etablissement } from 'src/app/interfaces/Etablissement';
import { EtablissementLogoComponent } from 'src/app/auth/shared/etablissement-logo/etablissement-logo.component';

@Component({
  selector: 'app-site-footer',
  standalone: true,
  imports: [CommonModule,
        EtablissementLogoComponent],
  template: `
    <footer class="bg-primary-900 text-white">
      <div class="max-w-7xl mx-auto px-6 lg:px-8 py-12">
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-10">

          <!-- Colonne 1 : identité -->
          <div>
            <div class="flex items-center gap-2.5 mb-4">
              <div class="w-9 h-9 rounded-full  bg-primary-700 flex items-center justify-center flex-shrink-0">
                <!-- <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M12 14l9-5-9-5-9 5 9 5z"/>
                  <path stroke-linecap="round" stroke-linejoin="round" d="M12 14l6.16-3.422A12.083 12.083 0 0121 12c0 4.418-4.03 8-9 8s-9-3.582-9-8c0-.538.057-1.063.164-1.578L12 14z"/>
                </svg> -->

                <vex-etablissement-logo imgClass="w-36 sm:w-36"></vex-etablissement-logo>
              </div>
              <div class="leading-none">
                <p class="font-bold text-white text-sm">{{ etablissement?.nom_court ?? 'G-2002' }}</p>
                <p class="text-primary-400 text-xs mt-0.5">{{ etablissement?.nom ?? 'Génération 2002' }}</p>
              </div>
            </div>
            <p class="text-primary-300 text-sm leading-relaxed italic mb-5">
              "{{ etablissement?.slogan ?? defaultSlogan }}"
            </p>
            <!-- Réseaux sociaux -->
            <div class="flex items-center gap-2.5">
              <a *ngIf="etablissement?.lien_facebook"
                [href]="etablissement!.lien_facebook"
                target="_blank" rel="noopener noreferrer"
                aria-label="Facebook"
                class="w-8 h-8 bg-primary-700 hover:bg-primary-600 rounded-lg flex items-center justify-center transition-colors focus:outline-none focus:ring-2 focus:ring-primary-400">
                <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                </svg>
              </a>
              <a *ngIf="etablissement?.lien_instagram"
                [href]="etablissement!.lien_instagram"
                target="_blank" rel="noopener noreferrer"
                aria-label="Instagram"
                class="w-8 h-8 bg-primary-700 hover:bg-primary-600 rounded-lg flex items-center justify-center transition-colors focus:outline-none focus:ring-2 focus:ring-primary-400">
                <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                </svg>
              </a>
              <a *ngIf="etablissement?.site_web"
                [href]="etablissement!.site_web"
                target="_blank" rel="noopener noreferrer"
                aria-label="Site web"
                class="w-8 h-8 bg-primary-700 hover:bg-primary-600 rounded-lg flex items-center justify-center transition-colors focus:outline-none focus:ring-2 focus:ring-primary-400">
                <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"/>
                </svg>
              </a>
            </div>
          </div>

          <!-- Colonne 2 : contact -->
          <div>
            <h3 class="text-xs font-bold uppercase tracking-widest text-primary-400 mb-5">Contact</h3>
            <ul class="space-y-3 text-sm">
              <li *ngIf="etablissement?.adresse" class="flex items-start gap-2.5 text-primary-200">
                <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 mt-0.5 flex-shrink-0 text-primary-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
                  <path stroke-linecap="round" stroke-linejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
                </svg>
                <span class="leading-relaxed">{{ etablissement!.adresse }}</span>
              </li>
              <li *ngIf="etablissement?.email" class="flex items-center gap-2.5 text-primary-200">
                <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 flex-shrink-0 text-primary-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
                </svg>
                <a [href]="'mailto:' + etablissement!.email" class="hover:text-white transition-colors break-all">{{ etablissement!.email }}</a>
              </li>
              <li *ngIf="etablissement?.telephone_principal || etablissement?.telephone_secondaire" class="flex items-center gap-2.5 text-primary-200">
                <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 flex-shrink-0 text-primary-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/>
                </svg>
                <span>
                  <ng-container *ngIf="etablissement!.telephone_principal">
                    <a [href]="'tel:' + etablissement!.telephone_principal" class="hover:text-white transition-colors">{{ etablissement!.telephone_principal }}</a>
                  </ng-container>
                  <ng-container *ngIf="etablissement!.telephone_principal && etablissement!.telephone_secondaire"> / </ng-container>
                  <ng-container *ngIf="etablissement!.telephone_secondaire">
                    <a [href]="'tel:' + etablissement!.telephone_secondaire" class="hover:text-white transition-colors">{{ etablissement!.telephone_secondaire }}</a>
                  </ng-container>
                </span>
              </li>
              <li *ngIf="etablissement?.site_web" class="flex items-center gap-2.5 text-primary-200">
                <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 flex-shrink-0 text-primary-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"/>
                </svg>
                <a [href]="etablissement!.site_web" target="_blank" rel="noopener noreferrer" class="hover:text-white transition-colors">{{ etablissement!.site_web }}</a>
              </li>
            </ul>
          </div>

          <!-- Colonne 3 : tutelles -->
          <div>
            <h3 class="text-xs font-bold uppercase tracking-widest text-primary-400 mb-5">Tutelle</h3>
            <ul class="space-y-4 text-sm">
              <li *ngIf="etablissement?.inspection_academique" class="flex items-start gap-2.5 text-primary-200">
                <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 mt-0.5 flex-shrink-0 text-primary-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/>
                </svg>
                <span class="leading-relaxed">{{ etablissement!.inspection_academique }}</span>
              </li>
              <li *ngIf="etablissement?.inspection_education_formation" class="flex items-start gap-2.5 text-primary-200">
                <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 mt-0.5 flex-shrink-0 text-primary-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"/>
                </svg>
                <span class="leading-relaxed">{{ etablissement!.inspection_education_formation }}</span>
              </li>
            </ul>
          </div>

        </div>
      </div>

      <!-- Copyright -->
      <div class="border-t border-primary-800">
        <div class="max-w-7xl mx-auto px-6 lg:px-8 py-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p class="text-xs text-primary-500">&copy; {{ currentYear }} {{ etablissement?.nom ?? 'Groupe Scolaire Génération 2002' }}. Tous droits réservés.</p>
        </div>
      </div>
    </footer>
  `
})
export class SiteFooterComponent {
  @Input() etablissement: Etablissement | null = null;
  readonly currentYear = new Date().getFullYear();
  readonly defaultSlogan = "L'excellence au service de l'innovation";
}
