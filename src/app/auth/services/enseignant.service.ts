import { HttpClient } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import { catchError, map, Observable, of } from 'rxjs';
import { Enseignant } from 'src/app/interfaces/Enseignant';
import {
  LaravelApiResponse,
  PaginationMeta,
  initialPaginationMeta
} from 'src/app/response-type/Type';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root'
})
export class EnseignantService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiUrl.replace(/\/+$/, '');

  private enseignantsSignal = signal<Enseignant[]>([]);
  private metaSignal = signal<PaginationMeta>(initialPaginationMeta);

  readonly enseignants = this.enseignantsSignal.asReadonly();
  readonly meta = this.metaSignal.asReadonly();

  getList(page = 1, perPage = 10, search = ''): Observable<Enseignant[]> {
    return this.http
      .get<LaravelApiResponse<Enseignant[]>>(`${this.baseUrl}/enseignants/list`, {
        params: { page, per_page: perPage, search }
      })
      .pipe(
        map((response) => {
          const data = response.payload ?? [];
          this.enseignantsSignal.set(data);
          if (response.meta) this.metaSignal.set(response.meta);
          return data;
        }),
        catchError((error) => {
          console.error('Erreur chargement enseignants:', error);
          return of([]);
        })
      );
  }

  getAll(): Observable<Enseignant[]> {
    return this.http
      .get<LaravelApiResponse<Enseignant[]>>(`${this.baseUrl}/enseignants/all`)
      .pipe(
        map((response) => {
          const data = response.payload ?? [];
          this.enseignantsSignal.set(data);
          return data;
        }),
        catchError((error) => {
          console.error('Erreur chargement tous les enseignants:', error);
          return of([]);
        })
      );
  }

  getById(id: number): Observable<Enseignant | null> {
    return this.http
      .get<LaravelApiResponse<Enseignant>>(`${this.baseUrl}/enseignants/show/${id}`)
      .pipe(
        map((response) => response.payload ?? null),
        catchError((error) => {
          console.error('Erreur chargement enseignant:', error);
          return of(null);
        })
      );
  }

  /** `contrat` porte les conditions d'engagement, créées avec l'enseignant. */
  create(data: { user: object; profil: object; contrat?: object }): Observable<LaravelApiResponse<Enseignant>> {
    return this.http.post<LaravelApiResponse<Enseignant>>(
      `${this.baseUrl}/enseignants/add`,
      data
    );
  }

  update(id: number, data: { user?: object; profil?: object }): Observable<LaravelApiResponse<Enseignant>> {
    return this.http.put<LaravelApiResponse<Enseignant>>(
      `${this.baseUrl}/enseignants/update/${id}`,
      data
    );
  }

  delete(id: number): Observable<LaravelApiResponse<null>> {
    return this.http.delete<LaravelApiResponse<null>>(
      `${this.baseUrl}/enseignants/delete/${id}`
    );
  }

  restore(id: number): Observable<LaravelApiResponse<Enseignant>> {
    return this.http.post<LaravelApiResponse<Enseignant>>(
      `${this.baseUrl}/enseignants/restore/${id}`,
      {}
    );
  }
}
