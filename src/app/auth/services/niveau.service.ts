import { HttpClient } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import { catchError, map, Observable, of } from 'rxjs';
import { AnneeScolaire } from 'src/app/interfaces/AnneeScolaire';
import {
  Niveau,
  NiveauGrille,
  NiveauPayload
} from 'src/app/interfaces/Niveau';
import {
  LaravelApiResponse,
  PaginationMeta,
  initialPaginationMeta
} from 'src/app/response-type/Type';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root'
})
export class NiveauService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiUrl.replace(/\/+$/, '');
  private niveauxSignal = signal<Niveau[]>([]);
  private metaSignal = signal<PaginationMeta>(initialPaginationMeta);

  /** Année tarifée par la grille chargée ; nulle si aucune n'est en cours. */
  private anneeSignal = signal<AnneeScolaire | null>(null);

  readonly niveaux = this.niveauxSignal.asReadonly();
  readonly meta = this.metaSignal.asReadonly();
  readonly annee = this.anneeSignal.asReadonly();

  getList(page = 1, perPage = 10): Observable<Niveau[]> {
    return this.http
      .get<LaravelApiResponse<Niveau[]>>(`${this.baseUrl}/niveaux/list`, {
        params: { page, per_page: perPage }
      })
      .pipe(
        map((response) => {
          const data = response.payload ?? [];
          this.niveauxSignal.set(data);
          if (response.meta) this.metaSignal.set(response.meta);
          return data;
        }),
        catchError((error) => {
          console.error('Erreur chargement niveaux:', error);
          return of([]);
        })
      );
  }

  /**
   * Référentiel complet des niveaux, non paginé : pour les listes déroulantes.
   * Ne porte aucun montant — les tarifs vivent dans les frais scolaires.
   */
  getAll(): Observable<Niveau[]> {
    return this.http
      .get<LaravelApiResponse<Niveau[]>>(`${this.baseUrl}/niveaux/all`)
      .pipe(
        map((response) => {
          const data = response.payload ?? [];
          this.niveauxSignal.set(data);
          return data;
        }),
        catchError((error) => {
          console.error('Erreur chargement tous les niveaux:', error);
          return of([]);
        })
      );
  }

  /**
   * Les niveaux avec leur barème de l'année en cours : ce qu'affiche
   * l'interface unifiée Niveaux & frais scolaires.
   */
  getGrille(): Observable<NiveauGrille> {
    return this.http
      .get<LaravelApiResponse<NiveauGrille>>(`${this.baseUrl}/niveaux/grille`)
      .pipe(
        map((response) => {
          const data = response.payload ?? { annee: null, niveaux: [] };
          this.niveauxSignal.set(data.niveaux ?? []);
          this.anneeSignal.set(data.annee ?? null);
          return data;
        }),
        catchError((error) => {
          console.error('Erreur chargement grille des niveaux:', error);
          return of({ annee: null, niveaux: [] } as NiveauGrille);
        })
      );
  }

  getById(id: number): Observable<Niveau | null> {
    return this.http
      .get<LaravelApiResponse<Niveau>>(`${this.baseUrl}/niveaux/show/${id}`)
      .pipe(
        map((response) => response.payload ?? null),
        catchError((error) => {
          console.error('Erreur chargement niveau:', error);
          return of(null);
        })
      );
  }

  /** Crée le niveau et, si des montants sont saisis, son barème de l'année. */
  create(niveau: NiveauPayload): Observable<LaravelApiResponse<Niveau>> {
    return this.http.post<LaravelApiResponse<Niveau>>(
      `${this.baseUrl}/niveaux/add`,
      niveau
    );
  }

  update(
    id: number,
    niveau: Partial<NiveauPayload>
  ): Observable<LaravelApiResponse<Niveau>> {
    return this.http.put<LaravelApiResponse<Niveau>>(
      `${this.baseUrl}/niveaux/update/${id}`,
      niveau
    );
  }

  delete(id: number): Observable<LaravelApiResponse<null>> {
    return this.http.delete<LaravelApiResponse<null>>(
      `${this.baseUrl}/niveaux/delete/${id}`
    );
  }
}
