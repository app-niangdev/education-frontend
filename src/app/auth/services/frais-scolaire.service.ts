import { HttpClient } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import { catchError, map, Observable, of } from 'rxjs';
import {
  FraisScolaire,
  FraisScolairePayload,
  FraisScolaireReferentiels,
  FraisScolaireUpdatePayload
} from 'src/app/interfaces/FraisScolaire';
import {
  LaravelApiResponse,
  PaginationMeta,
  initialPaginationMeta
} from 'src/app/response-type/Type';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root'
})
export class FraisScolaireService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiUrl.replace(/\/+$/, '');

  private fraisSignal = signal<FraisScolaire[]>([]);
  private metaSignal = signal<PaginationMeta>(initialPaginationMeta);

  readonly frais = this.fraisSignal.asReadonly();
  readonly meta = this.metaSignal.asReadonly();

  getList(page = 1, perPage = 10, search = ''): Observable<FraisScolaire[]> {
    return this.http
      .get<LaravelApiResponse<FraisScolaire[]>>(
        `${this.baseUrl}/frais-scolaires/list`,
        { params: { page, per_page: perPage, search } }
      )
      .pipe(
        map((response) => {
          const data = response.payload ?? [];
          this.fraisSignal.set(data);
          if (response.meta) this.metaSignal.set(response.meta);
          return data;
        }),
        catchError((error) => {
          console.error('Erreur chargement frais scolaires:', error);
          return of([]);
        })
      );
  }

  getAll(): Observable<FraisScolaire[]> {
    return this.http
      .get<LaravelApiResponse<FraisScolaire[]>>(
        `${this.baseUrl}/frais-scolaires/all`
      )
      .pipe(
        map((response) => response.payload ?? []),
        catchError((error) => {
          console.error('Erreur chargement tous les frais scolaires:', error);
          return of([]);
        })
      );
  }

  /**
   * Grille tarifaire de l'année en cours, chaque barème portant son niveau.
   * Route non authentifiée : utilisable par la page d'accueil, avant connexion.
   */
  listeFraisScolaires(): Observable<FraisScolaire[]> {
    return this.http
      .get<LaravelApiResponse<FraisScolaire[]>>(
        `${this.baseUrl}/liste-frais-scolaires`
      )
      .pipe(
        map((response) => response.payload ?? []),
        catchError((error) => {
          console.error('Erreur chargement grille tarifaire publique:', error);
          return of([]);
        })
      );
  }

  /**
   * Ce que le formulaire a le droit de proposer : l'année scolaire en cours
   * (seule sur laquelle un barème se crée) et les niveaux qui n'y ont pas
   * encore de barème. `fraisId` bascule sur le contexte du barème édité.
   */
  getReferentiels(fraisId?: number): Observable<FraisScolaireReferentiels> {
    return this.http
      .get<LaravelApiResponse<FraisScolaireReferentiels>>(
        `${this.baseUrl}/frais-scolaires/referentiels`,
        { params: fraisId ? { frais_id: fraisId } : {} }
      )
      .pipe(
        map((response) => response.payload ?? { annee: null, niveaux: [] }),
        catchError((error) => {
          console.error('Erreur chargement référentiels barème:', error);
          return of({ annee: null, niveaux: [] } as FraisScolaireReferentiels);
        })
      );
  }

  getById(id: number): Observable<FraisScolaire | null> {
    return this.http
      .get<LaravelApiResponse<FraisScolaire>>(
        `${this.baseUrl}/frais-scolaires/show/${id}`
      )
      .pipe(
        map((response) => response.payload ?? null),
        catchError((error) => {
          console.error('Erreur chargement barème:', error);
          return of(null);
        })
      );
  }

  create(
    data: FraisScolairePayload
  ): Observable<LaravelApiResponse<FraisScolaire>> {
    return this.http.post<LaravelApiResponse<FraisScolaire>>(
      `${this.baseUrl}/frais-scolaires/add`,
      data
    );
  }

  update(
    id: number,
    data: FraisScolaireUpdatePayload
  ): Observable<LaravelApiResponse<FraisScolaire>> {
    return this.http.put<LaravelApiResponse<FraisScolaire>>(
      `${this.baseUrl}/frais-scolaires/update/${id}`,
      data
    );
  }

  delete(id: number): Observable<LaravelApiResponse<null>> {
    return this.http.delete<LaravelApiResponse<null>>(
      `${this.baseUrl}/frais-scolaires/delete/${id}`
    );
  }

  /** Génère la grille tarifaire d'une année depuis celle de la précédente. */
  genererGrille(
    anneeId: number
  ): Observable<LaravelApiResponse<FraisScolaire[]>> {
    return this.http.post<LaravelApiResponse<FraisScolaire[]>>(
      `${this.baseUrl}/frais-scolaires/generer-grille/${anneeId}`,
      {}
    );
  }
}
