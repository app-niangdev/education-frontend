import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable, of } from 'rxjs';
import { TuteurRecherche } from 'src/app/interfaces/Tuteur';
import { LaravelApiResponse } from 'src/app/response-type/Type';
import { environment } from 'src/environments/environment';

/**
 * L'annuaire des tuteurs, consulté pendant la saisie d'un élève.
 *
 * Distinct de CompteTuteurService, qui gère les accès de connexion : ici on ne
 * fait que retrouver une fiche existante pour la rattacher à un nouvel élève.
 * Une fratrie partage un tuteur — sans cette recherche, l'agent le resaisit à
 * chaque enfant et l'établissement accumule les doublons.
 */
@Injectable({ providedIn: 'root' })
export class AnnuaireTuteurService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiUrl.replace(/\/+$/, '');

  /**
   * Cherche par nom, prénom, téléphone, NIN ou email.
   *
   * Une recherche vide ne part pas au serveur : elle ne peut rien ramener
   * d'utile, et l'appel se déclenche à la frappe.
   */
  rechercher(terme: string, limite = 10): Observable<TuteurRecherche[]> {
    const q = terme.trim();

    if (q === '') return of([]);

    return this.http
      .get<LaravelApiResponse<TuteurRecherche[]>>(
        `${this.baseUrl}/tuteurs/rechercher`,
        { params: new HttpParams().set('q', q).set('limite', limite) }
      )
      .pipe(map((reponse) => reponse.payload ?? []));
  }
}
