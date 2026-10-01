import { Injectable, OnDestroy } from '@angular/core';
import {
  NavigationDropdown,
  NavigationItem,
  NavigationLink
} from './navigation-item.interface';
import { BehaviorSubject, Observable, Subscription } from 'rxjs';
import { filter } from 'rxjs/operators';
import { AuthService } from 'src/app/auth/services/auth.service';
import { UserFromToken } from 'src/app/interfaces/Auth';
import { Menu } from 'src/app/interfaces/Menu';

@Injectable({ providedIn: 'root' })
export class NavigationLoaderService implements OnDestroy {
  private readonly _items = new BehaviorSubject<NavigationItem[]>([]);
  get items$(): Observable<NavigationItem[]> {
    return this._items.asObservable();
  }

  private userSubscription?: Subscription;

  constructor(private authService: AuthService) {
    this.userSubscription = this.authService.user$
      .pipe(filter((user): user is UserFromToken => user !== null))
      .subscribe((user) => this.buildNavigation(user));
  }

  ngOnDestroy(): void {
    this.userSubscription?.unsubscribe();
  }

  // ─── Entrée publique ─────────────────────────────────────────────────────────

  loadNavigationBasedOnRole(user?: UserFromToken): void {
    const current = user ?? this.authService.getCurrentUserSync();
    if (current) {
      this.buildNavigation(current);
    }
  }

  refreshNavigation(): void {
    this.loadNavigationBasedOnRole();
  }

  // ─── Construction ────────────────────────────────────────────────────────────

  private buildNavigation(user: UserFromToken): void {
    if (user.menus && user.menus.length > 0) {
      this._items.next(this.mapBackendMenus(user.menus));
      return;
    }
  }

  /**
   * Convertit les menus backend en NavigationItem[], en regroupant ceux qui
   * portent un `groupe` dans des sous-menus dépliants (NavigationDropdown).
   *
   * L'ordre est piloté par le backend via `position` : les menus sont triés,
   * un groupe apparaît à la position de son premier menu, et ses enfants
   * gardent l'ordre de tri. Un menu sans `groupe` reste un lien direct — rien
   * n'est perdu si le backend n'a pas (encore) renseigné le champ.
   */
  private mapBackendMenus(menus: Menu[]): NavigationItem[] {
    const sorted = [...menus].sort((a, b) => a.position - b.position);

    const items: NavigationItem[] = [];
    const groupes = new Map<string, NavigationDropdown>();

    for (const m of sorted) {
      const lien: NavigationLink = {
        type: 'link',
        label: m.title,
        route: m.url,
        icon: `mat:${m.icon}`
      };

      const nomGroupe = (m.groupe ?? '').trim();
      if (!nomGroupe) {
        items.push(lien);
        continue;
      }

      let groupe = groupes.get(nomGroupe);
      if (!groupe) {
        groupe = {
          type: 'dropdown',
          label: nomGroupe,
          icon: m.groupe_icon
            ? `mat:${m.groupe_icon}`
            : this.iconeGroupe(nomGroupe),
          children: []
        };
        groupes.set(nomGroupe, groupe);
        // Placé à la position de son premier menu (liste déjà triée).
        items.push(groupe);
      }

      groupe.children.push(lien);
    }

    return items;
  }

  /** Icône par défaut d'un groupe, si le backend n'en fournit pas. */
  private iconeGroupe(nom: string): string {
    const icones: Record<string, string> = {
      'Mon établissement': 'mat:business',
      Personnel: 'mat:badge',
      Paiement: 'mat:receipt',
      Finances: 'mat:assessment',
      Scolarité: 'mat:school'
    };

    return icones[nom] ?? 'mat:layers';
  }
}
