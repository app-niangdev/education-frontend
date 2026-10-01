import { Component, inject, Input, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Etablissement } from 'src/app/interfaces/Etablissement';
import { EtablissementLogoComponent } from 'src/app/auth/shared/etablissement-logo/etablissement-logo.component';

@Component({
  selector: 'app-site-header',
  standalone: true,
  imports: [CommonModule,
      EtablissementLogoComponent],
  template: `
    <header
      class="sticky top-0 z-50 bg-white border-b border-gray-100 shadow-sm">
      <div class="max-w-7xl mx-auto px-6 lg:px-8">
        <div class="flex items-center justify-between h-16">
          <!-- Logo -->
          <a
            (click)="scrollTo('accueil', $event)"
            href="#accueil"
            aria-label="Accueil"
            class="flex items-center gap-2.5 flex-shrink-0 cursor-pointer">
            <div
              class="w-9 h-9 rounded-full  flex items-center justify-center">
              <!-- <svg
                xmlns="http://www.w3.org/2000/svg"
                class="w-5 h-5 text-white"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                stroke-width="2"
                aria-hidden="true">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  d="M12 14l9-5-9-5-9 5 9 5z" />
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  d="M12 14l6.16-3.422A12.083 12.083 0 0121 12c0 4.418-4.03 8-9 8s-9-3.582-9-8c0-.538.057-1.063.164-1.578L12 14z" />
              </svg> -->

              <vex-etablissement-logo imgClass="w-36 sm:w-36"></vex-etablissement-logo>
            </div>
            <div class="leading-none">
              <p class="font-bold text-gray-900 text-sm">
                {{ etablissement?.nom_court ?? 'G-2002' }}
              </p>
              <p class="text-gray-400 text-xs">
                {{ etablissement?.nom ?? 'Génération 2002' }}
              </p>
            </div>
          </a>

          <!-- Nav desktop -->
          <nav
            class="hidden md:flex items-center gap-8"
            aria-label="Navigation principale">
            <a
              (click)="scrollTo('accueil', $event)"
              href="#accueil"
              class="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors cursor-pointer"
              >Accueil</a
            >
            <a
              (click)="scrollTo('frais', $event)"
              href="#frais"
              class="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors cursor-pointer"
              >Frais</a
            >
            <a
              (click)="scrollTo('contact', $event)"
              href="#contact"
              class="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors cursor-pointer"
              >Contact</a
            >
          </nav>

          <!-- CTA + burger -->
          <div class="flex items-center gap-2">
            <!-- Se connecter -->
            <button
              (click)="goToLogin()"
              class="hidden md:inline-flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 text-sm font-semibold rounded-lg hover:bg-gray-50 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                class="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                stroke-width="2"
                aria-hidden="true">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
              </svg>
              Se connecter
            </button>
            <!-- Nous contacter -->
            <a
              (click)="scrollTo('contact', $event)"
              href="#contact"
              class="hidden md:inline-flex items-center gap-2 px-4 py-2 bg-primary-700 text-white text-sm font-semibold rounded-lg hover:bg-primary-800 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-600 focus:ring-offset-2 cursor-pointer">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                class="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                stroke-width="2"
                aria-hidden="true">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              Nous contacter
            </a>
            <!-- Burger mobile -->
            <button
              class="md:hidden p-2 rounded-lg text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-600"
              (click)="toggleMenu()"
              [attr.aria-expanded]="menuOpen()"
              aria-controls="mobile-nav"
              aria-label="Menu de navigation">
              <svg
                *ngIf="!menuOpen()"
                xmlns="http://www.w3.org/2000/svg"
                class="w-5 h-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                stroke-width="2"
                aria-hidden="true">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  d="M4 6h16M4 12h16M4 18h16" />
              </svg>
              <svg
                *ngIf="menuOpen()"
                xmlns="http://www.w3.org/2000/svg"
                class="w-5 h-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                stroke-width="2"
                aria-hidden="true">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      <!-- Menu mobile -->
      <div
        *ngIf="menuOpen()"
        id="mobile-nav"
        class="md:hidden border-t border-gray-100 bg-white">
        <div class="max-w-7xl mx-auto px-6 py-3 flex flex-col gap-1">
          <a
            (click)="scrollTo('accueil', $event); menuOpen.set(false)"
            href="#accueil"
            class="px-3 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
            >Accueil</a
          >
          <a
            (click)="scrollTo('frais', $event); menuOpen.set(false)"
            href="#frais"
            class="px-3 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
            >Frais</a
          >
          <a
            (click)="scrollTo('contact', $event); menuOpen.set(false)"
            href="#contact"
            class="px-3 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
            >Contact</a
          >
          <div class="flex flex-col gap-2 mt-2 pt-2 border-t border-gray-100">
            <button
              (click)="goToLogin(); menuOpen.set(false)"
              class="w-full px-4 py-2.5 border border-gray-300 text-gray-700 text-sm font-semibold rounded-lg text-center hover:bg-gray-50 transition-colors flex items-center justify-center gap-2">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                class="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                stroke-width="2"
                aria-hidden="true">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
              </svg>
              Se connecter
            </button>
            <a
              (click)="scrollTo('contact', $event); menuOpen.set(false)"
              href="#contact"
              class="px-4 py-2.5 bg-primary-700 text-white text-sm font-semibold rounded-lg text-center hover:bg-primary-800 transition-colors"
              >Nous contacter</a
            >
          </div>
        </div>
      </div>
    </header>
  `
})
export class SiteHeaderComponent {
  @Input() etablissement: Etablissement | null = null;
  readonly menuOpen = signal(false);

  private readonly router = inject(Router);

  toggleMenu(): void {
    this.menuOpen.update((v) => !v);
  }

  goToLogin(): void {
    this.router.navigate(['/login']);
  }

  scrollTo(id: string, event: Event): void {
    event.preventDefault();
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }
}
