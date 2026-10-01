import { Injectable } from '@angular/core';
import { OtpChallengeData } from 'src/app/interfaces/Auth';

/**
 * Ce que la page de vérification a besoin de savoir entre deux écrans.
 *
 * Conservé en `sessionStorage` et non en `localStorage` : une vérification
 * abandonnée ne doit pas ressurgir dans un autre onglet ni survivre à la
 * fermeture du navigateur.
 *
 * Ce jeton ne vaut rien à lui seul — il désigne une vérification en cours, que
 * le serveur relit à chaque appel et qu'il refuse depuis une autre adresse. La
 * décision reste entièrement de son côté.
 */
@Injectable({ providedIn: 'root' })
export class OtpStateService {
  private readonly CHALLENGE_KEY = 'otp_challenge';

  /** Mémorise le challenge ouvert par /auth/login. */
  set(challenge: OtpChallengeData): void {
    sessionStorage.setItem(this.CHALLENGE_KEY, JSON.stringify(challenge));
  }

  get(): OtpChallengeData | null {
    const brut = sessionStorage.getItem(this.CHALLENGE_KEY);
    if (!brut) return null;

    try {
      return JSON.parse(brut) as OtpChallengeData;
    } catch {
      // Contenu abîmé : on repart de zéro plutôt que de propager l'erreur.
      this.clear();
      return null;
    }
  }

  clear(): void {
    sessionStorage.removeItem(this.CHALLENGE_KEY);
  }
}
