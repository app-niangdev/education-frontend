import { HttpClient } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import { catchError, map, Observable, of } from 'rxjs';
import {
  Bulletin,
  BulletinMeta,
  ConseilClassePayload,
  GenererBulletinsPayload,
  GenerationResultat,
  PublierBulletinsPayload,
  StatutBulletin
} from 'src/app/interfaces/Bulletin';
import {
  LaravelApiResponse,
  PaginationMeta,
  initialPaginationMeta
} from 'src/app/response-type/Type';
import { environment } from 'src/environments/environment';

/**
 * Bulletins de notes.
 *
 * La génération et la publication portent sur une classe entière : le rang
 * d'un élève n'a de sens que rapporté à ses camarades. Publier fige les
 * bulletins — une correction de note ultérieure ne les modifie plus.
 *
 * La liste est bornée côté backend : un enseignant ne voit que ses classes,
 * le trésorier n'y a pas accès du tout.
 */
@Injectable({
  providedIn: 'root'
})
export class BulletinService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiUrl.replace(/\/+$/, '');

  private bulletinsSignal = signal<Bulletin[]>([]);
  private metaSignal = signal<PaginationMeta>(initialPaginationMeta);

  readonly bulletins = this.bulletinsSignal.asReadonly();
  readonly meta = this.metaSignal.asReadonly();

  getList(
    page = 1,
    perPage = 10,
    search = '',
    classeId?: number | null,
    periodeId?: number | null,
    statut?: StatutBulletin | null
  ): Observable<Bulletin[]> {
    const params: Record<string, string | number> = {
      page,
      per_page: perPage,
      search
    };
    if (classeId) params['classe_id'] = classeId;
    if (periodeId) params['periode_id'] = periodeId;
    if (statut) params['statut'] = statut;

    return this.http
      .get<LaravelApiResponse<Bulletin[]>>(`${this.baseUrl}/bulletins/list`, {
        params
      })
      .pipe(
        map((response) => {
          const data = response.payload ?? [];
          this.bulletinsSignal.set(data);
          if (response.meta) this.metaSignal.set(response.meta);
          return data;
        }),
        catchError((error) => {
          console.error('Erreur chargement bulletins:', error);
          return of([]);
        })
      );
  }

  /** Statuts, mentions, décisions du conseil et distinctions. */
  getMeta(): Observable<BulletinMeta | null> {
    return this.http
      .get<LaravelApiResponse<BulletinMeta>>(`${this.baseUrl}/bulletins/meta`)
      .pipe(
        map((response) => response.payload ?? null),
        catchError((error) => {
          console.error('Erreur chargement métadonnées bulletins:', error);
          return of(null);
        })
      );
  }

  getById(id: number): Observable<Bulletin | null> {
    return this.http
      .get<LaravelApiResponse<Bulletin>>(`${this.baseUrl}/bulletins/show/${id}`)
      .pipe(
        map((response) => response.payload ?? null),
        catchError((error) => {
          console.error('Erreur chargement bulletin:', error);
          return of(null);
        })
      );
  }

  /** Génère ou recalcule les brouillons de toute une classe. */
  generer(
    payload: GenererBulletinsPayload
  ): Observable<LaravelApiResponse<GenerationResultat>> {
    return this.http.post<LaravelApiResponse<GenerationResultat>>(
      `${this.baseUrl}/bulletins/generer`,
      payload
    );
  }

  updateConseil(
    id: number,
    payload: ConseilClassePayload
  ): Observable<LaravelApiResponse<Bulletin>> {
    return this.http.put<LaravelApiResponse<Bulletin>>(
      `${this.baseUrl}/bulletins/conseil-classe/${id}`,
      payload
    );
  }

  publierClasse(
    payload: PublierBulletinsPayload
  ): Observable<LaravelApiResponse<{ publies: number }>> {
    return this.http.post<LaravelApiResponse<{ publies: number }>>(
      `${this.baseUrl}/bulletins/publier`,
      payload
    );
  }

  publierUn(id: number): Observable<LaravelApiResponse<Bulletin>> {
    return this.http.post<LaravelApiResponse<Bulletin>>(
      `${this.baseUrl}/bulletins/publier/${id}`,
      {}
    );
  }

  depublierClasse(
    payload: PublierBulletinsPayload
  ): Observable<LaravelApiResponse<{ depublies: number }>> {
    return this.http.post<LaravelApiResponse<{ depublies: number }>>(
      `${this.baseUrl}/bulletins/depublier`,
      payload
    );
  }

  depublierUn(id: number): Observable<LaravelApiResponse<Bulletin>> {
    return this.http.post<LaravelApiResponse<Bulletin>>(
      `${this.baseUrl}/bulletins/depublier/${id}`,
      {}
    );
  }

  downloadPdf(id: number): Observable<Blob> {
    return this.http.get(`${this.baseUrl}/bulletins/pdf/${id}`, {
      responseType: 'blob'
    });
  }

  /** Les bulletins de toute la classe en un seul PDF, une page par élève. */
  downloadPdfClasse(classeId: number, periodeId: number): Observable<Blob> {
    return this.http.get(`${this.baseUrl}/bulletins/pdf-classe`, {
      params: { classe_id: classeId, periode_id: periodeId },
      responseType: 'blob'
    });
  }
}
