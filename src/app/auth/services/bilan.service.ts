import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { catchError, map, Observable, of } from 'rxjs';
import { Bilan, BilanFiltres } from 'src/app/interfaces/Bilan';
import { LaravelApiResponse } from 'src/app/response-type/Type';
import { environment } from 'src/environments/environment';

@Injectable({ providedIn: 'root' })
export class BilanService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiUrl.replace(/\/+$/, '');

  /**
   * Bilan financier de l'année scolaire (celle en cours par défaut),
   * éventuellement restreint à un mois. Réservé trésorier/manager/admin.
   *
   * Le mois n'est transmis qu'accompagné de son année civile : une année
   * scolaire couvre deux millésimes, le backend refuse l'un sans l'autre.
   */
  getBilan(filtres: BilanFiltres = {}): Observable<Bilan | null> {
    let params = new HttpParams();

    if (filtres.annee_scolaire_id) {
      params = params.set('annee_scolaire_id', String(filtres.annee_scolaire_id));
    }

    if (filtres.mois && filtres.annee) {
      params = params
        .set('mois', String(filtres.mois))
        .set('annee', String(filtres.annee));
    }

    return this.http
      .get<LaravelApiResponse<Bilan>>(`${this.baseUrl}/bilan`, { params })
      .pipe(
        map((response) => response.payload ?? null),
        catchError((error) => {
          console.error('Erreur chargement du bilan financier:', error);
          return of(null);
        })
      );
  }
}
