import { HttpClient } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import { catchError, map, Observable, of } from 'rxjs';
import { Tresorier } from 'src/app/interfaces/Tresorier';
import {
  LaravelApiResponse,
  PaginationMeta,
  initialPaginationMeta
} from 'src/app/response-type/Type';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root'
})
export class TresorierService {
  private readonly http    = inject(HttpClient);
  private readonly baseUrl = environment.apiUrl.replace(/\/+$/, '');

  private tresoriersSignal = signal<Tresorier[]>([]);
  private metaSignal        = signal<PaginationMeta>(initialPaginationMeta);

  readonly tresoriers = this.tresoriersSignal.asReadonly();
  readonly meta       = this.metaSignal.asReadonly();

  getList(page = 1, perPage = 10, search = ''): Observable<Tresorier[]> {
    return this.http
      .get<LaravelApiResponse<Tresorier[]>>(`${this.baseUrl}/tresoriers/list`, {
        params: { page, per_page: perPage, search }
      })
      .pipe(
        map((res) => {
          const data = res.payload ?? [];
          this.tresoriersSignal.set(data);
          if (res.meta) this.metaSignal.set(res.meta);
          return data;
        }),
        catchError((err) => { console.error(err); return of([]); })
      );
  }

  getAll(): Observable<Tresorier[]> {
    return this.http
      .get<LaravelApiResponse<Tresorier[]>>(`${this.baseUrl}/tresoriers/all`)
      .pipe(
        map((res) => {
          const data = res.payload ?? [];
          this.tresoriersSignal.set(data);
          return data;
        }),
        catchError((err) => { console.error(err); return of([]); })
      );
  }

  getById(id: number): Observable<Tresorier | null> {
    return this.http
      .get<LaravelApiResponse<Tresorier>>(`${this.baseUrl}/tresoriers/show/${id}`)
      .pipe(
        map((res) => res.payload ?? null),
        catchError((err) => { console.error(err); return of(null); })
      );
  }

  /** `contrat` porte les conditions d'engagement, créées avec le trésorier. */
  create(data: { user: object; profil: object; contrat?: object }): Observable<LaravelApiResponse<Tresorier>> {
    return this.http.post<LaravelApiResponse<Tresorier>>(
      `${this.baseUrl}/tresoriers/add`, data
    );
  }

  update(id: number, data: { user?: object; profil?: object }): Observable<LaravelApiResponse<Tresorier>> {
    return this.http.put<LaravelApiResponse<Tresorier>>(
      `${this.baseUrl}/tresoriers/update/${id}`, data
    );
  }

  delete(id: number): Observable<LaravelApiResponse<null>> {
    return this.http.delete<LaravelApiResponse<null>>(
      `${this.baseUrl}/tresoriers/delete/${id}`
    );
  }

  restore(id: number): Observable<LaravelApiResponse<Tresorier>> {
    return this.http.post<LaravelApiResponse<Tresorier>>(
      `${this.baseUrl}/tresoriers/restore/${id}`, {}
    );
  }
}
