import { HttpClient } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import { catchError, map, Observable, of } from 'rxjs';
import { Eleve, EleveRequest, RapportImport } from 'src/app/interfaces/Eleve';
import { LigneImport } from 'src/app/features/manager/eleve/eleve-import/eleve-import.parser';
import {
  LaravelApiResponse,
  PaginationMeta,
  initialPaginationMeta
} from 'src/app/response-type/Type';
import { environment } from 'src/environments/environment';

export interface EleveFilters {
  /**
   * Recherche ciblee sur le seul matricule, distincte du `search` large qui
   * balaie aussi les noms, telephones et le tuteur.
   */
  matricule?: string | null;
  classe_actuelle_id?: number | null;
  statut_inscription?: string | null;
  sexe?: string | null;
}

@Injectable({
  providedIn: 'root'
})
export class EleveService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiUrl.replace(/\/+$/, '');

  private elevesSignal = signal<Eleve[]>([]);
  private metaSignal = signal<PaginationMeta>(initialPaginationMeta);

  readonly eleves = this.elevesSignal.asReadonly();
  readonly meta = this.metaSignal.asReadonly();

  /**
   * Recherche et pagination cote serveur. Le backend cherche aussi sur le nom,
   * le telephone et le NIN du tuteur.
   */
  getList(
    page = 1,
    perPage = 10,
    search = '',
    filters: EleveFilters = {}
  ): Observable<Eleve[]> {
    const params: Record<string, string | number> = {
      page,
      per_page: perPage,
      search
    };

    // Les filtres vides ne doivent pas partir : le backend les traite
    // avec when(), mais une chaine vide vaut `false` cote PHP et serait
    // ignoree — autant garder l'URL propre.
    for (const [key, value] of Object.entries(filters)) {
      if (value !== null && value !== undefined && value !== '') {
        params[key] = value as string | number;
      }
    }

    return this.http
      .get<LaravelApiResponse<Eleve[]>>(`${this.baseUrl}/eleves/list`, { params })
      .pipe(
        map((response) => {
          const data = response.payload ?? [];
          this.elevesSignal.set(data);
          if (response.meta) this.metaSignal.set(response.meta);
          return data;
        }),
        catchError((error) => {
          console.error('Erreur chargement élèves:', error);
          return of([]);
        })
      );
  }

  /**
   * Recherche destinee aux listes deroulantes : renvoie les eleves ET le
   * nombre total de correspondances.
   *
   * Volontairement distincte de `getList` : celle-ci alimente les signaux
   * partages `eleves`/`meta`, sur lesquels s'appuie l'ecran de liste. Un
   * selecteur qui les ecraserait a chaque frappe changerait la liste affichee
   * ailleurs dans l'application.
   *
   * Le total permet a l'appelant de dire que d'autres resultats existent
   * au-dela de ceux montres — un utilisateur qui ne voit pas son eleve doit
   * savoir s'il est absent ou seulement hors de la tranche affichee.
   */
  rechercher(
    terme: string,
    limite = 20
  ): Observable<{ eleves: Eleve[]; total: number }> {
    return this.http
      .get<LaravelApiResponse<Eleve[]>>(`${this.baseUrl}/eleves/list`, {
        params: { page: 1, per_page: limite, search: terme }
      })
      .pipe(
        map((response) => ({
          eleves: response.payload ?? [],
          total: response.meta?.total ?? (response.payload ?? []).length
        })),
        catchError((error) => {
          console.error('Erreur recherche élèves:', error);
          return of({ eleves: [] as Eleve[], total: 0 });
        })
      );
  }

  getAll(): Observable<Eleve[]> {
    return this.http
      .get<LaravelApiResponse<Eleve[]>>(`${this.baseUrl}/eleves/all`)
      .pipe(
        map((response) => {
          const data = response.payload ?? [];
          this.elevesSignal.set(data);
          return data;
        }),
        catchError((error) => {
          console.error('Erreur chargement tous les élèves:', error);
          return of([]);
        })
      );
  }

  getById(id: number): Observable<Eleve | null> {
    return this.http
      .get<LaravelApiResponse<Eleve>>(`${this.baseUrl}/eleves/show/${id}`)
      .pipe(
        map((response) => response.payload ?? null),
        catchError((error) => {
          console.error('Erreur chargement élève:', error);
          return of(null);
        })
      );
  }

  create(data: EleveRequest): Observable<LaravelApiResponse<Eleve>> {
    return this.http.post<LaravelApiResponse<Eleve>>(
      `${this.baseUrl}/eleves/add`,
      data
    );
  }

  /**
   * Accepte un payload partiel : n'envoyer que le bloc `eleve` laisse le
   * tuteur intact, et inversement. C'est ce qui permet a la fiche detail
   * d'editer une seule section a la fois.
   */
  update(id: number, data: EleveRequest): Observable<LaravelApiResponse<Eleve>> {
    return this.http.put<LaravelApiResponse<Eleve>>(
      `${this.baseUrl}/eleves/update/${id}`,
      data
    );
  }

  /**
   * Reprise de donnees : envoie un lot de lignes deja lues et validees par le
   * navigateur (voir eleve-import.parser).
   *
   * Pas de `catchError` ici, a la difference des lectures : l'appelant doit
   * distinguer un lot refuse d'un lot vide pour construire son rapport.
   */
  importer(lignes: LigneImport[]): Observable<LaravelApiResponse<RapportImport>> {
    return this.http.post<LaravelApiResponse<RapportImport>>(
      `${this.baseUrl}/eleves/import`,
      { lignes }
    );
  }

  delete(id: number): Observable<LaravelApiResponse<null>> {
    return this.http.delete<LaravelApiResponse<null>>(
      `${this.baseUrl}/eleves/delete/${id}`
    );
  }

  restore(id: number): Observable<LaravelApiResponse<Eleve>> {
    return this.http.post<LaravelApiResponse<Eleve>>(
      `${this.baseUrl}/eleves/restore/${id}`,
      {}
    );
  }
}
