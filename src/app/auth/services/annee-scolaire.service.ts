import { HttpClient } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import { catchError, map, Observable, of } from 'rxjs';
import {
  AnneeScolaire,
  AnneeScolaireCreatePayload,
  AnneeScolairePayload
} from 'src/app/interfaces/AnneeScolaire';
import {
  LaravelApiResponse,
  PaginationMeta,
  initialPaginationMeta
} from 'src/app/response-type/Type';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root'
})
export class AnneeScolaireService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiUrl.replace(/\/+$/, '');
  private anneesScolairesSignal = signal<AnneeScolaire[]>([]);
  private metaSignal = signal<PaginationMeta>(initialPaginationMeta);
  readonly anneesScolaires = this.anneesScolairesSignal.asReadonly();
  readonly meta = this.metaSignal.asReadonly();

  getList(page = 1, perPage = 10): Observable<AnneeScolaire[]> {
    return this.http
      .get<LaravelApiResponse<AnneeScolaire[]>>(
        `${this.baseUrl}/annees-scolaires/list`,
        { params: { page, per_page: perPage } }
      )
      .pipe(
        map((response) => {
          const data = response.payload ?? [];
          this.anneesScolairesSignal.set(data);
          if (response.meta) this.metaSignal.set(response.meta);
          return data;
        }),
        catchError((error) => {
          console.error('Erreur chargement années scolaires:', error);
          return of([]);
        })
      );
  }

  getById(id: number): Observable<AnneeScolaire | null> {
    return this.http
      .get<LaravelApiResponse<AnneeScolaire>>(
        `${this.baseUrl}/annees-scolaires/show/${id}`
      )
      .pipe(
        map((response) => response.payload ?? null),
        catchError((error) => {
          console.error('Erreur chargement année scolaire:', error);
          return of(null);
        })
      );
  }

  /**
   * `en_cours` n'est acceptee qu'ici, et seulement pour amorcer : tant qu'aucune
   * annee n'est active, la premiere doit pouvoir s'activer. Ensuite le serveur
   * la refuse et un index unique garantit qu'une seule annee la porte.
   */
  create(
    anneeScolaire: AnneeScolaireCreatePayload
  ): Observable<LaravelApiResponse<AnneeScolaire>> {
    return this.http.post<LaravelApiResponse<AnneeScolaire>>(
      `${this.baseUrl}/annees-scolaires/add`,
      anneeScolaire
    );
  }

  update(
    id: number,
    anneeScolaire: Partial<AnneeScolairePayload>
  ): Observable<LaravelApiResponse<AnneeScolaire>> {
    return this.http.put<LaravelApiResponse<AnneeScolaire>>(
      `${this.baseUrl}/annees-scolaires/update/${id}`,
      anneeScolaire
    );
  }

  delete(id: number): Observable<LaravelApiResponse<null>> {
    return this.http.delete<LaravelApiResponse<null>>(
      `${this.baseUrl}/annees-scolaires/delete/${id}`
    );
  }
}
