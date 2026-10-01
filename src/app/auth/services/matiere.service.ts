import { HttpClient } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import { catchError, map, Observable, of } from 'rxjs';
import { Matiere, MatierePayload } from 'src/app/interfaces/Matiere';
import {
  LaravelApiResponse,
  PaginationMeta,
  initialPaginationMeta
} from 'src/app/response-type/Type';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root'
})
export class MatiereService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiUrl.replace(/\/+$/, '');

  private matieresSignal = signal<Matiere[]>([]);
  private metaSignal = signal<PaginationMeta>(initialPaginationMeta);

  readonly matieres = this.matieresSignal.asReadonly();
  readonly meta = this.metaSignal.asReadonly();

  getList(page = 1, perPage = 10, search = ''): Observable<Matiere[]> {
    return this.http
      .get<LaravelApiResponse<Matiere[]>>(`${this.baseUrl}/matieres/list`, {
        params: { page, per_page: perPage, search }
      })
      .pipe(
        map((response) => {
          const data = response.payload ?? [];
          this.matieresSignal.set(data);
          if (response.meta) this.metaSignal.set(response.meta);
          return data;
        }),
        catchError((error) => {
          console.error('Erreur chargement matières:', error);
          return of([]);
        })
      );
  }

  getAll(): Observable<Matiere[]> {
    return this.http
      .get<LaravelApiResponse<Matiere[]>>(`${this.baseUrl}/matieres/all`)
      .pipe(
        map((response) => response.payload ?? []),
        catchError((error) => {
          console.error('Erreur chargement toutes les matières:', error);
          return of([]);
        })
      );
  }

  getById(id: number): Observable<Matiere | null> {
    return this.http
      .get<LaravelApiResponse<Matiere>>(`${this.baseUrl}/matieres/show/${id}`)
      .pipe(
        map((response) => response.payload ?? null),
        catchError((error) => {
          console.error('Erreur chargement matière:', error);
          return of(null);
        })
      );
  }

  create(matiere: MatierePayload): Observable<LaravelApiResponse<Matiere>> {
    return this.http.post<LaravelApiResponse<Matiere>>(
      `${this.baseUrl}/matieres/add`,
      matiere
    );
  }

  update(
    id: number,
    matiere: Partial<MatierePayload>
  ): Observable<LaravelApiResponse<Matiere>> {
    return this.http.put<LaravelApiResponse<Matiere>>(
      `${this.baseUrl}/matieres/update/${id}`,
      matiere
    );
  }

  delete(id: number): Observable<LaravelApiResponse<null>> {
    return this.http.delete<LaravelApiResponse<null>>(
      `${this.baseUrl}/matieres/delete/${id}`
    );
  }
}
