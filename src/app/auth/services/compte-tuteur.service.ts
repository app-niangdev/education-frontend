import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { LaravelApiResponse } from 'src/app/response-type/Type';
import { environment } from 'src/environments/environment';

/** Ce que renvoie le serveur après l'ouverture d'un accès. */
export interface CompteTuteurCree {
  tuteur: {
    id: number;
    nom: string;
    prenom: string;
    telephone_principal: string;
    email?: string | null;
    user_id: number | null;
    user?: {
      id: number;
      email: string | null;
      username: string;
      must_change_password: boolean;
    } | null;
  };
  /**
   * Le mot de passe en clair, renvoyé UNE SEULE FOIS.
   *
   * Il n'est stocké nulle part et aucune route ne permet de le relire : s'il
   * n'est pas transmis à la famille maintenant, la seule issue est la
   * réinitialisation. L'écran doit donc le montrer sans ambiguïté.
   */
  mot_de_passe: string;
}

/**
 * Les accès de connexion des tuteurs.
 *
 * Ouvrir un accès est une décision de l'établissement : l'API la réserve à
 * l'admin et au manager. Ce service ne fait que porter les appels ; les droits
 * sont tranchés côté serveur.
 */
@Injectable({ providedIn: 'root' })
export class CompteTuteurService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiUrl.replace(/\/+$/, '');

  /**
   * Ouvre l'accès. `telephone` et `email` sont facultatifs : sans eux, le
   * serveur reprend ceux de la fiche tuteur. Le téléphone est l'identifiant de
   * connexion — le serveur refuse la création s'il manque des deux côtés.
   */
  creer(
    tuteurId: number,
    donnees: { telephone?: string; email?: string } = {}
  ): Observable<CompteTuteurCree> {
    return this.http
      .post<LaravelApiResponse<CompteTuteurCree>>(
        `${this.baseUrl}/tuteurs/${tuteurId}/compte`,
        donnees
      )
      .pipe(map((reponse) => reponse.payload));
  }

  /** Produit un nouveau mot de passe : la famille a perdu le sien. */
  reinitialiser(tuteurId: number): Observable<CompteTuteurCree> {
    return this.http
      .post<LaravelApiResponse<CompteTuteurCree>>(
        `${this.baseUrl}/tuteurs/${tuteurId}/compte/reinitialiser`,
        {}
      )
      .pipe(map((reponse) => reponse.payload));
  }

  /** Ferme l'accès. La fiche tuteur et les conversations sont conservées. */
  revoquer(tuteurId: number): Observable<boolean> {
    return this.http
      .delete<LaravelApiResponse<unknown>>(
        `${this.baseUrl}/tuteurs/${tuteurId}/compte`
      )
      .pipe(map(() => true));
  }
}
