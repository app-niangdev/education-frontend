import { HttpClient } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import { catchError, map, Observable, of } from 'rxjs';
import { Surveillant } from 'src/app/interfaces/Surveillant';
import {
  LaravelApiResponse,
  PaginationMeta,
  initialPaginationMeta
} from 'src/app/response-type/Type';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root'
})
export class SurveillantService {
  private readonly http    = inject(HttpClient);
  private readonly baseUrl = environment.apiUrl.replace(/\/+$/, '');

  private surveillantsSignal = signal<Surveillant[]>([]);
  private metaSignal         = signal<PaginationMeta>(initialPaginationMeta);

  readonly surveillants = this.surveillantsSignal.asReadonly();
  readonly meta         = this.metaSignal.asReadonly();

  getList(page = 1, perPage = 10, search = ''): Observable<Surveillant[]> {
    return this.http
      .get<LaravelApiResponse<Surveillant[]>>(`${this.baseUrl}/surveillants/list`, {
        params: { page, per_page: perPage, search }
      })
      .pipe(
        map((res) => {
          const data = res.payload ?? [];
          this.surveillantsSignal.set(data);
          if (res.meta) this.metaSignal.set(res.meta);
          return data;
        }),
        catchError((err) => { console.error(err); return of([]); })
      );
  }

  getAll(): Observable<Surveillant[]> {
    return this.http
      .get<LaravelApiResponse<Surveillant[]>>(`${this.baseUrl}/surveillants/all`)
      .pipe(
        map((res) => {
          const data = res.payload ?? [];
          this.surveillantsSignal.set(data);
          return data;
        }),
        catchError((err) => { console.error(err); return of([]); })
      );
  }

  getById(id: number): Observable<Surveillant | null> {
    return this.http
      .get<LaravelApiResponse<Surveillant>>(`${this.baseUrl}/surveillants/show/${id}`)
      .pipe(
        map((res) => res.payload ?? null),
        catchError((err) => { console.error(err); return of(null); })
      );
  }

  /** `contrat` porte les conditions d'engagement, créées avec le surveillant. */
  create(data: { user: object; profil: object; contrat?: object }): Observable<LaravelApiResponse<Surveillant>> {
    return this.http.post<LaravelApiResponse<Surveillant>>(
      `${this.baseUrl}/surveillants/add`, data
    );
  }

  update(id: number, data: { user?: object; profil?: object }): Observable<LaravelApiResponse<Surveillant>> {
    return this.http.put<LaravelApiResponse<Surveillant>>(
      `${this.baseUrl}/surveillants/update/${id}`, data
    );
  }

  delete(id: number): Observable<LaravelApiResponse<null>> {
    return this.http.delete<LaravelApiResponse<null>>(
      `${this.baseUrl}/surveillants/delete/${id}`
    );
  }

  restore(id: number): Observable<LaravelApiResponse<Surveillant>> {
    return this.http.post<LaravelApiResponse<Surveillant>>(
      `${this.baseUrl}/surveillants/restore/${id}`, {}
    );
  }
}
