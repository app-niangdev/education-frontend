import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FraisScolaireService } from 'src/app/auth/services/frais-scolaire.service';
import { FraisScolaire } from 'src/app/interfaces/FraisScolaire';

/** Les barèmes d'un même cycle, sous le libellé lisible de celui-ci. */
interface GroupeCycle {
  cycle: string;
  libelle: string;
  baremes: FraisScolaire[];
}

@Component({
  selector: 'app-fees-section',
  standalone: true,
  imports: [CommonModule],
  template: `
    <section
      id="frais"
      class="bg-white py-16 md:py-20"
      aria-labelledby="fees-title">
      <div class="max-w-7xl mx-auto px-6 lg:px-8">
        <!-- En-tête -->
        <div class="text-center mb-12">
          <h2
            id="fees-title"
            class="text-3xl sm:text-4xl font-bold text-gray-900 mb-3">
            Frais d'inscription &amp; de mensualité
          </h2>
          <p class="text-gray-500 text-base max-w-md mx-auto leading-relaxed">
            Des tarifs transparents par niveau. Tous les montants sont indiqués
            en francs CFA (FCFA).
          </p>
          <p
            *ngIf="anneeScolaire"
            class="mt-3 inline-block text-xs font-semibold text-primary-700 bg-primary-50 px-3 py-1 rounded-full">
            Année scolaire {{ anneeScolaire }}
          </p>
        </div>

        <!-- Groupes par cycle -->
        <div *ngFor="let groupe of groupesParCycle" class="mb-10 last:mb-0">
          <!-- Titre cycle avec bordure gauche verte -->
          <div class="flex items-center gap-3 mb-5">
            <div class="w-1 h-6 bg-primary-600 rounded-full flex-shrink-0"></div>
            <h3 class="text-lg font-bold text-gray-800">{{ groupe.libelle }}</h3>
          </div>

          <!-- Grille de cartes -->
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <article
              *ngFor="let bareme of groupe.baremes"
              class="bg-white border border-gray-200 rounded-xl overflow-hidden hover:border-primary-300 hover:shadow-md transition-all duration-200">
              <!-- En-tête carte -->
              <div
                class="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                <span class="font-bold text-gray-900 text-sm">{{
                  bareme.niveau?.nom
                }}</span>
                <span
                  class="text-xs font-semibold text-primary-700 bg-primary-50 px-2 py-0.5 rounded-full"
                  >{{ bareme.niveau?.code }}</span
                >
              </div>

              <!-- Lignes tarifs -->
              <div class="px-4 py-3 space-y-2.5">
                <div class="flex items-center justify-between">
                  <span class="text-xs text-gray-500 font-medium"
                    >Inscription</span
                  >
                  <span class="text-sm font-bold text-gray-900">{{
                    formatAmount(bareme.montant_inscription)
                  }}</span>
                </div>
                <div class="h-px bg-gray-100"></div>
                <div class="flex items-center justify-between">
                  <span class="text-xs text-gray-500 font-medium"
                    >Mensualité</span
                  >
                  <span class="text-sm font-bold text-primary-700"
                    >{{ formatAmount(bareme.montant_mensualite) }}
                    <span class="font-normal text-gray-400 text-xs"
                      >/ mois</span
                    ></span
                  >
                </div>
                <div class="h-px bg-gray-100"></div>
                <div class="flex items-center justify-between">
                  <span class="text-xs text-gray-500 font-medium"
                    >Frais annuel</span
                  >
                  <span class="text-sm font-bold text-gray-900">{{
                    formatAmount(bareme.frais_annuel)
                  }}</span>
                </div>
              </div>
            </article>
          </div>
        </div>

        <!-- Aucun barème saisi pour l'année en cours -->
        <p
          *ngIf="baremes.length === 0"
          class="text-center text-gray-400 text-sm">
          Les tarifs de l'année scolaire en cours seront publiés prochainement.
        </p>

        <!-- Note -->
        <p
          class="text-center text-gray-400 text-sm mt-10 flex items-center justify-center gap-1.5">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            class="w-4 h-4 text-primary-500 flex-shrink-0"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            stroke-width="2"
            aria-hidden="true">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Tarifs indicatifs — contactez-nous pour toute question.
        </p>
      </div>
    </section>
  `
})
/**
 * Les tarifs affichés proviennent de la grille des frais scolaires de l'année
 * en cours : c'est la seule source des montants, le niveau n'en porte plus.
 */
export class FeesSectionComponent implements OnInit {
  private readonly fraisScolaireService = inject(FraisScolaireService);

  baremes: FraisScolaire[] = [];

  /**
   * Barèmes regroupés par cycle, calculés une fois au chargement plutôt qu'à
   * chaque cycle de détection : un getter serait réévalué en boucle par *ngFor.
   */
  groupesParCycle: GroupeCycle[] = [];

  ngOnInit(): void {
    this.fraisScolaireService.listeFraisScolaires().subscribe((baremes) => {
      this.baremes = baremes;
      this.groupesParCycle = this.grouperParCycle(baremes);
    });
  }

  /** Année scolaire de la grille : identique pour tous les barèmes renvoyés. */
  get anneeScolaire(): string | null {
    return this.baremes[0]?.annee_scolaire?.nom ?? null;
  }

  /**
   * Le backend trie déjà par cycle puis par progression scolaire : on conserve
   * cet ordre d'apparition plutôt que d'en imposer un autre.
   */
  private grouperParCycle(baremes: FraisScolaire[]): GroupeCycle[] {
    const groupes = new Map<string, GroupeCycle>();

    for (const bareme of baremes) {
      const cycle = bareme.niveau?.cycle;

      if (!cycle) continue;

      const groupe = groupes.get(cycle);

      if (groupe) {
        groupe.baremes.push(bareme);
      } else {
        groupes.set(cycle, {
          cycle,
          libelle: bareme.niveau?.cycle_libelle ?? cycle,
          baremes: [bareme]
        });
      }
    }

    return [...groupes.values()];
  }

  formatAmount(amount: number): string {
    return amount.toLocaleString('fr-FR') + ' FCFA';
  }
}
