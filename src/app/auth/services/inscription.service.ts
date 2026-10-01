import { HttpClient } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import { catchError, map, Observable, of } from 'rxjs';
import {
  Inscription,
  InscriptionPayload,
  InscriptionUpdatePayload
} from 'src/app/interfaces/Inscription';
import {
  LaravelApiResponse,
  PaginationMeta,
  initialPaginationMeta
} from 'src/app/response-type/Type';
import { environment } from 'src/environments/environment';

export interface InscriptionFilters {
  /** Matricule de l'eleve, cherche seul (sans le bruit de `search`). */
  matricule?: string | null;
  numero_inscription?: string | null;
  classe_id?: number | null;
  statut_inscription?: string | null;
  statut_paiement?: string | null;
  type_inscription?: string | null;
}

@Injectable({
  providedIn: 'root'
})
export class InscriptionService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiUrl.replace(/\/+$/, '');

  private inscriptionsSignal = signal<Inscription[]>([]);
  private metaSignal = signal<PaginationMeta>(initialPaginationMeta);

  readonly inscriptions = this.inscriptionsSignal.asReadonly();
  readonly meta = this.metaSignal.asReadonly();

  /** Le backend ne renvoie que les inscriptions de l'annee scolaire en cours. */
  getList(
    page = 1,
    perPage = 10,
    search = '',
    filters: InscriptionFilters = {}
  ): Observable<Inscription[]> {
    const params: Record<string, string | number> = {
      page,
      per_page: perPage,
      search
    };

    // Les filtres vides ne partent pas : cote PHP une chaine vide vaut
    // `false` et serait ignoree par when(), autant garder l'URL propre.
    for (const [key, value] of Object.entries(filters)) {
      if (value !== null && value !== undefined && value !== '') {
        params[key] = value as string | number;
      }
    }

    return this.http
      .get<LaravelApiResponse<Inscription[]>>(`${this.baseUrl}/inscriptions/list`, {
        params
      })
      .pipe(
        map((response) => {
          const data = response.payload ?? [];
          this.inscriptionsSignal.set(data);
          if (response.meta) this.metaSignal.set(response.meta);
          return data;
        }),
        catchError((error) => {
          console.error('Erreur chargement inscriptions:', error);
          return of([]);
        })
      );
  }

  getAll(): Observable<Inscription[]> {
    return this.http
      .get<LaravelApiResponse<Inscription[]>>(`${this.baseUrl}/inscriptions/all`)
      .pipe(
        map((response) => response.payload ?? []),
        catchError((error) => {
          console.error('Erreur chargement toutes les inscriptions:', error);
          return of([]);
        })
      );
  }

  getById(id: number): Observable<Inscription | null> {
    return this.http
      .get<LaravelApiResponse<Inscription>>(`${this.baseUrl}/inscriptions/show/${id}`)
      .pipe(
        map((response) => response.payload ?? null),
        catchError((error) => {
          console.error('Erreur chargement inscription:', error);
          return of(null);
        })
      );
  }

  /**
   * Le type (nouvelle / reinscription) et le montant sont determines par le
   * backend : on n'envoie que l'eleve et la classe.
   */
  create(data: InscriptionPayload): Observable<LaravelApiResponse<Inscription>> {
    return this.http.post<LaravelApiResponse<Inscription>>(
      `${this.baseUrl}/inscriptions/add`,
      data
    );
  }

  update(
    id: number,
    data: InscriptionUpdatePayload
  ): Observable<LaravelApiResponse<Inscription>> {
    return this.http.put<LaravelApiResponse<Inscription>>(
      `${this.baseUrl}/inscriptions/update/${id}`,
      data
    );
  }

  /** Le backend refuse d'annuler une inscription deja encaissee. */
  annuler(id: number, motif?: string | null): Observable<LaravelApiResponse<Inscription>> {
    return this.http.post<LaravelApiResponse<Inscription>>(
      `${this.baseUrl}/inscriptions/annuler/${id}`,
      motif ? { motif } : {}
    );
  }

  delete(id: number): Observable<LaravelApiResponse<null>> {
    return this.http.delete<LaravelApiResponse<null>>(
      `${this.baseUrl}/inscriptions/delete/${id}`
    );
  }

  /** Télécharge la fiche de renseignement en PDF (réponse binaire). */
  downloadFichePdf(id: number): Observable<Blob> {
    return this.http.get(`${this.baseUrl}/inscriptions/fiche-pdf/${id}`, {
      responseType: 'blob'
    });
  }
}
