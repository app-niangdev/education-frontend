import { Injectable } from '@angular/core';
import chroma from 'chroma-js';

/**
 * Applique dynamiquement une couleur primaire à toute la plateforme.
 *
 * Le thème vex expose la couleur primaire via des variables CSS au format
 * « canaux RGB » (ex: `--vex-color-primary-600: 22 197 94`), consommées
 * directement par Tailwind (`bg-primary-*`, `text-primary-*`).
 * En surchargeant ces variables en inline sur <body>, on écrase la classe de
 * thème et toute l'interface se met à jour instantanément.
 *
 * Angular Material, lui, fige sa palette à la compilation Sass : ses couleurs
 * sont rebranchées sur ces mêmes variables par la feuille
 * `@vex/styles/partials/plugins/@angular/material/_dynamic-primary.scss`.
 * Toute nuance ajoutée/retirée ici doit y rester disponible.
 */
@Injectable({ providedIn: 'root' })
export class ThemeColorService {
  /** Cle de persistance de la couleur primaire choisie. */
  private static readonly STORAGE_KEY = 'app_primary_color';

  private readonly shades = [
    50, 100, 200, 300, 400, 500, 600, 700, 800, 900
  ] as const;

  constructor() {
    // Applique immediatement la derniere couleur connue au demarrage, sans
    // attendre l'appel API : le theme reste stable apres un rechargement.
    this.applyStoredColor();
  }

  /**
   * Luminance relative cible par nuance (échelle proche de Tailwind).
   * La nuance 600 (couleur par défaut du thème) reste la couleur choisie.
   */
  private readonly luminanceTargets: Record<number, number | null> = {
    50: 0.95,
    100: 0.86,
    200: 0.72,
    300: 0.55,
    400: 0.4,
    500: 0.28,
    600: null,
    700: 0.145,
    800: 0.09,
    900: 0.05
  };

  /** Applique la couleur choisie comme couleur primaire de la plateforme. */
  applyPrimaryColor(hex: string | null | undefined): void {
    if (!hex || !chroma.valid(hex)) {
      return;
    }

    // Persiste la couleur pour la reappliquer immediatement au prochain chargement.
    try {
      localStorage.setItem(ThemeColorService.STORAGE_KEY, hex);
    } catch {
      /* localStorage indisponible : on ignore, l'application reste possible */
    }

    const base = chroma(hex);
    const body = document.body;

    // Le loader de demarrage vit dans index.html, hors de portee d'Angular : il
    // lit cette variable au prochain chargement. La tenir a jour ici evite qu'il
    // ne reste sur la couleur precedente apres un changement de parametrage.
    document.documentElement.style.setProperty(
      '--vex-splash-loader-color',
      base.hex()
    );

    for (const shade of this.shades) {
      const target = this.luminanceTargets[shade];
      const color = target === null ? base : base.luminance(target);
      const [r, g, b] = color.rgb();

      body.style.setProperty(`--vex-color-primary-${shade}`, `${r} ${g} ${b}`);

      // Couleur de texte lisible par-dessus cette nuance (on-primary)
      const onPrimary =
        chroma.contrast(color, 'white') >= chroma.contrast(color, 'black')
          ? '255 255 255'
          : '0 0 0';
      body.style.setProperty(`--vex-color-on-primary-${shade}`, onPrimary);
    }
  }

  /** Réapplique la couleur persistée (appelé au démarrage). */
  applyStoredColor(): void {
    const stored = this.getStoredColor();
    if (stored) {
      this.applyPrimaryColor(stored);
    }
  }

  /**
   * Applique la couleur renvoyée par le backend, qui fait autorité : la couleur
   * primaire est un paramètre d'établissement, pas une préférence par appareil.
   *
   * Le localStorage ne sert que de cache anti-flash au démarrage (voir
   * `applyStoredColor`) : il ne doit jamais empêcher la valeur du serveur de
   * s'appliquer, sinon un changement de couleur resterait invisible sur les
   * postes ayant déjà une valeur en cache.
   */
  syncFromBackend(hex: string | null | undefined): void {
    // Backend sans couleur définie : on conserve le cache plutôt que de
    // repasser brutalement au thème par défaut.
    if (!hex) {
      return;
    }
    this.applyPrimaryColor(hex);
  }

  /** Retourne la couleur persistée, ou null. */
  private getStoredColor(): string | null {
    try {
      return localStorage.getItem(ThemeColorService.STORAGE_KEY);
    } catch {
      return null;
    }
  }

  /** Rétablit la couleur primaire définie par le thème (retire les surcharges). */
  reset(): void {
    const body = document.body;
    for (const shade of this.shades) {
      body.style.removeProperty(`--vex-color-primary-${shade}`);
      body.style.removeProperty(`--vex-color-on-primary-${shade}`);
    }

    // Sans cela, le loader de demarrage garderait la couleur qu'on vient
    // justement de retirer.
    document.documentElement.style.removeProperty('--vex-splash-loader-color');
    try {
      localStorage.removeItem(ThemeColorService.STORAGE_KEY);
    } catch {
      /* rien à faire */
    }
  }
}
