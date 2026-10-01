import { HttpClient } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import { catchError, map, Observable, of } from 'rxjs';
import {
  Depense,
  DepenseFiltres,
  DepensePayload,
  DepenseReferentiels,
  DepenseTotaux,
  DepenseUpdatePayload,
  MoisAnneeEnCours
} from 'src/app/interfaces/Depense';
import {
  initialPaginationMeta,
  LaravelApiResponse,
  PaginationMeta
} from 'src/app/response-type/Type';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root'
})
export class DepenseService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiUrl.replace(/\/+$/, '');

  private depensesSignal = signal<Depense[]>([]);
  private metaSignal = signal<PaginationMeta>(initialPaginationMeta);

  readonly depenses = this.depensesSignal.asReadonly();
  readonly meta = this.metaSignal.asReadonly();

  getList(
    page = 1,
    perPage = 10,
    filtres: DepenseFiltres = {}
  ): Observable<Depense[]> {
    return this.http
      .get<LaravelApiResponse<Depense[]>>(`${this.baseUrl}/depenses/list`, {
        params: this.toParams(page, perPage, filtres)
      })
      .pipe(
        map((response) => {
          const data = response.payload ?? [];
          this.depensesSignal.set(data);
          if (response.meta) this.metaSignal.set(response.meta);
          return data;
        }),
        catchError((error) => {
          console.error('Erreur chargement dépenses:', error);
          return of([]);
        })
      );
  }

  /** Totaux du même périmètre filtré que la liste. */
  getTotaux(filtres: DepenseFiltres = {}): Observable<DepenseTotaux | null> {
    return this.http
      .get<LaravelApiResponse<DepenseTotaux>>(`${this.baseUrl}/depenses/totaux`, {
        params: this.toParams(1, 1, filtres)
      })
      .pipe(
        map((response) => response.payload ?? null),
        catchError((error) => {
          console.error('Erreur chargement totaux dépenses:', error);
          return of(null);
        })
      );
  }

  /** Les mois de l'année scolaire en cours, pour le filtre mensuel. */
  getMoisAnneeEnCours(): Observable<MoisAnneeEnCours | null> {
    return this.http
      .get<LaravelApiResponse<MoisAnneeEnCours>>(
        `${this.baseUrl}/depenses/mois-en-cours`
      )
      .pipe(
        map((response) => response.payload ?? null),
        catchError((error) => {
          console.error('Erreur chargement mois année en cours:', error);
          return of(null);
        })
      );
  }

  /** Catégories et modes de paiement pour les listes déroulantes. */
  getReferentiels(): Observable<DepenseReferentiels | null> {
    return this.http
      .get<LaravelApiResponse<DepenseReferentiels>>(
        `${this.baseUrl}/depenses/referentiels`
      )
      .pipe(
        map((response) => response.payload ?? null),
        catchError((error) => {
          console.error('Erreur chargement référentiels dépenses:', error);
          return of(null);
        })
      );
  }

  getById(id: number): Observable<Depense | null> {
    return this.http
      .get<LaravelApiResponse<Depense>>(`${this.baseUrl}/depenses/show/${id}`)
      .pipe(
        map((response) => response.payload ?? null),
        catchError((error) => {
          console.error('Erreur chargement dépense:', error);
          return of(null);
        })
      );
  }

  create(data: DepensePayload): Observable<LaravelApiResponse<Depense>> {
    return this.http.post<LaravelApiResponse<Depense>>(
      `${this.baseUrl}/depenses/add`,
      data
    );
  }

  update(
    id: number,
    data: DepenseUpdatePayload
  ): Observable<LaravelApiResponse<Depense>> {
    return this.http.put<LaravelApiResponse<Depense>>(
      `${this.baseUrl}/depenses/update/${id}`,
      data
    );
  }

  /**
   * Valide la dépense : le manager engage l'établissement, et la dépense entre
   * alors dans les totaux et le bilan. Réservé au manager et à l'admin — le
   * serveur applique la même règle.
   */
  valider(id: number): Observable<LaravelApiResponse<Depense>> {
    return this.http.post<LaravelApiResponse<Depense>>(
      `${this.baseUrl}/depenses/valider/${id}`,
      {}
    );
  }

  /** Refuse la dépense. Le motif est obligatoire et reste sur la fiche. */
  refuser(
    id: number,
    motif: string
  ): Observable<LaravelApiResponse<Depense>> {
    return this.http.post<LaravelApiResponse<Depense>>(
      `${this.baseUrl}/depenses/refuser/${id}`,
      { motif_refus: motif }
    );
  }

  delete(id: number): Observable<LaravelApiResponse<null>> {
    return this.http.delete<LaravelApiResponse<null>>(
      `${this.baseUrl}/depenses/delete/${id}`
    );
  }

  /** Ne transmet que les critères réellement renseignés. */
  private toParams(
    page: number,
    perPage: number,
    filtres: DepenseFiltres
  ): Record<string, string | number | boolean> {
    const params: Record<string, string | number | boolean> = {
      page,
      per_page: perPage
    };

    if (filtres.search) params['search'] = filtres.search;
    if (filtres.categorie) params['categorie'] = filtres.categorie;
    if (filtres.mode_paiement) params['mode_paiement'] = filtres.mode_paiement;
    if (filtres.statut) params['statut'] = filtres.statut;
    if (filtres.date) params['date'] = filtres.date;
    if (filtres.date_from) params['date_from'] = filtres.date_from;
    if (filtres.date_to) params['date_to'] = filtres.date_to;
    if (filtres.mois) params['mois'] = filtres.mois;
    if (filtres.annee) params['annee'] = filtres.annee;
    // « 1 » et non `true` : HttpClient sérialise un booléen en « true », que la
    // règle `boolean` de Laravel refuse — elle n'admet que 1, 0, "1" et "0".
    if (filtres.toutes_annees) params['toutes_annees'] = 1;

    return params;
  }
}
