import { HttpClient } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import { catchError, map, Observable, of } from 'rxjs';
import { Classe, ClassePayload } from 'src/app/interfaces/Classe';
import {
  LaravelApiResponse,
  PaginationMeta,
  initialPaginationMeta
} from 'src/app/response-type/Type';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ClasseService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiUrl.replace(/\/+$/, '');

  private classesSignal = signal<Classe[]>([]);
  private metaSignal = signal<PaginationMeta>(initialPaginationMeta);

  readonly classes = this.classesSignal.asReadonly();
  readonly meta = this.metaSignal.asReadonly();

  /**
   * Le backend ne renvoie que les classes de l'annee scolaire en cours.
   * La recherche et la pagination sont faites cote serveur.
   */
  getList(page = 1, perPage = 10, search = ''): Observable<Classe[]> {
    return this.http
      .get<LaravelApiResponse<Classe[]>>(`${this.baseUrl}/classes/list`, {
        params: { page, per_page: perPage, search }
      })
      .pipe(
        map((response) => {
          const data = response.payload ?? [];
          this.classesSignal.set(data);
          if (response.meta) this.metaSignal.set(response.meta);
          return data;
        }),
        catchError((error) => {
          console.error('Erreur chargement classes:', error);
          return of([]);
        })
      );
  }

  getAll(): Observable<Classe[]> {
    return this.http
      .get<LaravelApiResponse<Classe[]>>(`${this.baseUrl}/classes/all`)
      .pipe(
        map((response) => {
          const data = response.payload ?? [];
          this.classesSignal.set(data);
          return data;
        }),
        catchError((error) => {
          console.error('Erreur chargement toutes les classes:', error);
          return of([]);
        })
      );
  }

  getById(id: number): Observable<Classe | null> {
    return this.http
      .get<LaravelApiResponse<Classe>>(`${this.baseUrl}/classes/show/${id}`)
      .pipe(
        map((response) => response.payload ?? null),
        catchError((error) => {
          console.error('Erreur chargement classe:', error);
          return of(null);
        })
      );
  }

  create(classe: ClassePayload): Observable<LaravelApiResponse<Classe>> {
    return this.http.post<LaravelApiResponse<Classe>>(
      `${this.baseUrl}/classes/add`,
      classe
    );
  }

  update(
    id: number,
    classe: Partial<ClassePayload>
  ): Observable<LaravelApiResponse<Classe>> {
    return this.http.put<LaravelApiResponse<Classe>>(
      `${this.baseUrl}/classes/update/${id}`,
      classe
    );
  }

  delete(id: number): Observable<LaravelApiResponse<null>> {
    return this.http.delete<LaravelApiResponse<null>>(
      `${this.baseUrl}/classes/delete/${id}`
    );
  }
}
