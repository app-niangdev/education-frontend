import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Etablissement } from 'src/app/interfaces/Etablissement';

@Component({
  selector: 'app-hero-section',
  standalone: true,
  imports: [CommonModule],
  template: `
    <section id="accueil" class="bg-gray-50 py-16 md:py-20" aria-labelledby="hero-title">
      <div class="max-w-7xl mx-auto px-6 lg:px-8">
        <div class="flex flex-col md:flex-row items-center gap-12 md:gap-16">

          <!-- Texte gauche -->
          <div class="flex-1 min-w-0">
            <!-- Tag adresse -->
            <div class="inline-flex items-center gap-1.5 bg-white border border-gray-200 text-gray-600 text-xs font-medium px-3 py-1.5 rounded-full mb-5 shadow-sm">
              <svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
                <path stroke-linecap="round" stroke-linejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
              </svg>
              {{ etablissement?.adresse ?? 'Dakar, Sénégal' }}
            </div>

            <h1 id="hero-title" class="text-4xl sm:text-5xl font-extrabold text-gray-900 leading-tight text-balance mb-4">
              {{ etablissement?.nom ?? 'Groupe Scolaire Génération 2002' }}
            </h1>

            <p class="text-lg text-gray-500 mb-3 italic">
              {{ etablissement?.slogan ?? defaultSlogan }}
            </p>

            <p class="text-base text-gray-600 leading-relaxed mb-8 max-w-lg">
              Un établissement d'excellence du Collège au Lycée, offrant un encadrement de qualité et un suivi personnalisé pour chaque élève.
            </p>

            <!-- CTA -->
            <div class="flex flex-wrap gap-3">
              <a href="#frais"
                class="inline-flex items-center gap-2 px-5 py-2.5 bg-primary-700 text-white text-sm font-semibold rounded-lg hover:bg-primary-800 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-600 focus:ring-offset-2 shadow-sm">
                <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z"/>
                </svg>
                Voir les frais
              </a>
              <a href="#contact"
                class="inline-flex items-center gap-2 px-5 py-2.5 bg-white text-gray-700 text-sm font-semibold rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2 shadow-sm">
                <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
                </svg>
                Nous contacter
              </a>
            </div>
          </div>

          <!-- Image droite -->
          <div class="flex-shrink-0 w-full md:w-[420px] lg:w-[480px]">
            <div class="relative rounded-2xl overflow-hidden shadow-xl aspect-[4/3] bg-primary-100">
              <img
                src="https://images.unsplash.com/photo-1529390079861-591de354faf5?w=900&auto=format&fit=crop&q=80"
                alt="Élèves du Groupe Scolaire Génération 2002 en classe"
                class="w-full h-full object-cover"
                loading="lazy"/>
              <!-- Badge flottant -->
              <div class="absolute bottom-4 left-4 bg-white/90 backdrop-blur-sm rounded-xl px-4 py-2.5 shadow-lg">
                <p class="text-xs text-gray-500 font-medium">Établissement agréé</p>
                <p class="text-sm font-bold text-primary-700">{{ etablissement?.inspection_academique ?? 'IA de Dakar' }}</p>
              </div>
            </div>
          </div>

        </div>
      </div>
    </section>
  `
})
export class HeroSectionComponent {
  @Input() etablissement: Etablissement | null = null;
  readonly defaultSlogan = "L'excellence au service de l'innovation";
}
