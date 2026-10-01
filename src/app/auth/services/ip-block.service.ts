import { Injectable, OnDestroy } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { IpBlockedError } from 'src/app/interfaces/Auth';

/** Ce que l'interface affiche pendant un blocage. */
export interface IpBlockState {
  /** Secondes restantes, décomptées localement. */
  retryAfter: number;
  /** Fin du blocage telle qu'annoncée par le serveur. */
  blockedUntil: string | null;
  message: string;
}

/**
 * Le blocage d'IP vu du navigateur.
 *
 * Un point d'attention : ce compte à rebours n'est qu'un affichage. Il dit à
 * l'utilisateur combien de temps patienter, il ne débloque rien. Arrivé à zéro,
 * le formulaire se rouvre — et c'est le serveur, seul, qui acceptera ou non la
 * tentative suivante. Une horloge locale avancée ne fait donc gagner que le
 * droit de recevoir un nouveau 429.
 */
@Injectable({ providedIn: 'root' })
export class IpBlockService implements OnDestroy {
  private readonly etat$ = new BehaviorSubject<IpBlockState | null>(null);
  private timer?: ReturnType<typeof setInterval>;

  /** Null tant qu'aucun blocage n'est connu. */
  get state$(): Observable<IpBlockState | null> {
    return this.etat$.asObservable();
  }

  get snapshot(): IpBlockState | null {
    return this.etat$.getValue();
  }

  get isBlocked(): boolean {
    return (this.etat$.getValue()?.retryAfter ?? 0) > 0;
  }

  /**
   * Enregistre un refus 429 et démarre le décompte.
   *
   * Le serveur reste la référence : chaque nouveau refus écrase le décompte en
   * cours, même s'il annonce une durée plus longue que celle affichée.
   */
  declare(erreur: IpBlockedError): void {
    const secondes = Math.max(0, Math.floor(erreur.retry_after ?? 0));

    this.etat$.next({
      retryAfter: secondes,
      blockedUntil: erreur.blocked_until ?? null,
      message: erreur.message ?? 'Trop de tentatives de connexion.'
    });

    this.demarrer();
  }

  /** Efface l'état, par exemple après une connexion réussie. */
  clear(): void {
    this.arreter();
    this.etat$.next(null);
  }

  ngOnDestroy(): void {
    this.arreter();
  }

  private demarrer(): void {
    this.arreter();

    this.timer = setInterval(() => {
      const courant = this.etat$.getValue();
      if (!courant) {
        this.arreter();
        return;
      }

      const restant = courant.retryAfter - 1;

      if (restant <= 0) {
        // Le décompte est fini : on rouvre le formulaire. Le serveur tranchera.
        this.arreter();
        this.etat$.next({ ...courant, retryAfter: 0 });
        return;
      }

      this.etat$.next({ ...courant, retryAfter: restant });
    }, 1000);
  }

  private arreter(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = undefined;
    }
  }
}

/** 100 s → « 01:40 ». Au-delà de l'heure, on préfixe les heures. */
export function formatCountdown(secondes: number): string {
  const s = Math.max(0, Math.floor(secondes));
  const heures = Math.floor(s / 3600);
  const minutes = Math.floor((s % 3600) / 60);
  const restantes = s % 60;

  const deuxChiffres = (n: number) => n.toString().padStart(2, '0');

  return heures > 0
    ? `${deuxChiffres(heures)}:${deuxChiffres(minutes)}:${deuxChiffres(restantes)}`
    : `${deuxChiffres(minutes)}:${deuxChiffres(restantes)}`;
}
