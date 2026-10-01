import { HttpClient } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import { catchError, map, Observable, of } from 'rxjs';
import { ActivityLog } from 'src/app/interfaces/ActivityLog';
import {
  LaravelApiResponse,
  PaginationMeta,
  initialPaginationMeta
} from 'src/app/response-type/Type';
import { environment } from 'src/environments/environment';

export interface ActivityLogFilters {
  search?:    string;
  user_id?:   number | null;
  action?:    string;
  module?:    string;
  date_from?: string;
  date_to?:   string;
}

@Injectable({ providedIn: 'root' })
export class ActivityLogService {
  private readonly http    = inject(HttpClient);
  private readonly baseUrl = environment.apiUrl.replace(/\/+$/, '');

  private logsSignal = signal<ActivityLog[]>([]);
  private metaSignal = signal<PaginationMeta>(initialPaginationMeta);

  readonly logs = this.logsSignal.asReadonly();
  readonly meta = this.metaSignal.asReadonly();

  getList(
    page    = 1,
    perPage = 20,
    filters: ActivityLogFilters = {}
  ): Observable<ActivityLog[]> {
    const params: Record<string, string | number> = { page, per_page: perPage };
    if (filters.search)    params['search']    = filters.search;
    if (filters.user_id)   params['user_id']   = filters.user_id;
    if (filters.action)    params['action']    = filters.action;
    if (filters.module)    params['module']    = filters.module;
    if (filters.date_from) params['date_from'] = filters.date_from;
    if (filters.date_to)   params['date_to']   = filters.date_to;

    return this.http
      .get<LaravelApiResponse<ActivityLog[]>>(`${this.baseUrl}/activity-logs/list`, { params })
      .pipe(
        map((res) => {
          const data = res.payload ?? [];
          this.logsSignal.set(data);
          if (res.meta) this.metaSignal.set(res.meta);
          return data;
        }),
        catchError((err) => { console.error(err); return of([]); })
      );
  }

  getById(id: number): Observable<ActivityLog | null> {
    return this.http
      .get<LaravelApiResponse<ActivityLog>>(`${this.baseUrl}/activity-logs/show/${id}`)
      .pipe(
        map((res) => res.payload ?? null),
        catchError((err) => { console.error(err); return of(null); })
      );
  }

  purge(days: number): Observable<LaravelApiResponse<{ deleted_count: number }>> {
    return this.http.delete<LaravelApiResponse<{ deleted_count: number }>>(
      `${this.baseUrl}/activity-logs/purge`,
      { params: { days } }
    );
  }
}
