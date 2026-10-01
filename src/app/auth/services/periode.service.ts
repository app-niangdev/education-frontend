import { HttpClient } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import { catchError, map, Observable, of } from 'rxjs';
import { Periode } from 'src/app/interfaces/Periode';
import { LaravelApiResponse, PaginationMeta, initialPaginationMeta } from 'src/app/response-type/Type';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root'
})
export class PeriodeService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiUrl.replace(/\/+$/, '');
  private periodesSignal = signal<Periode[]>([]);
  private metaSignal = signal<PaginationMeta>(initialPaginationMeta);
  readonly periodes = this.periodesSignal.asReadonly();
  readonly meta = this.metaSignal.asReadonly();

  getList(page = 1, perPage = 10): Observable<Periode[]> {
    return this.http
      .get<LaravelApiResponse<Periode[]>>(
        `${this.baseUrl}/periodes/list`,
        { params: { page, per_page: perPage } }
      )
      .pipe(
        map((response) => {
          const data = response.payload ?? [];
          this.periodesSignal.set(data);
          if (response.meta) this.metaSignal.set(response.meta);
          return data;
        }),
        catchError((error) => {
          console.error('Erreur chargement périodes:', error);
          return of([]);
        })
      );
  }

  getByAnnee(anneeId: number): Observable<Periode[]> {
    return this.http
      .get<LaravelApiResponse<Periode[]>>(
        `${this.baseUrl}/periodes/by-annee/${anneeId}`
      )
      .pipe(
        map((response) => {
          const data = response.payload ?? [];
          this.periodesSignal.set(data);
          return data;
        }),
        catchError((error) => {
          console.error('Erreur chargement périodes par année:', error);
          return of([]);
        })
      );
  }

  getById(id: number): Observable<Periode | null> {
    return this.http
      .get<LaravelApiResponse<Periode>>(
        `${this.baseUrl}/periodes/show/${id}`
      )
      .pipe(
        map((response) => response.payload ?? null),
        catchError((error) => {
          console.error('Erreur chargement période:', error);
          return of(null);
        })
      );
  }

  create(periode: Omit<Periode, 'id'>): Observable<LaravelApiResponse<Periode>> {
    return this.http.post<LaravelApiResponse<Periode>>(
      `${this.baseUrl}/periodes/add`,
      periode
    );
  }

  update(id: number, periode: Partial<Omit<Periode, 'id'>>): Observable<LaravelApiResponse<Periode>> {
    return this.http.put<LaravelApiResponse<Periode>>(
      `${this.baseUrl}/periodes/update/${id}`,
      periode
    );
  }

  delete(id: number): Observable<LaravelApiResponse<null>> {
    return this.http.delete<LaravelApiResponse<null>>(
      `${this.baseUrl}/periodes/delete/${id}`
    );
  }
}
