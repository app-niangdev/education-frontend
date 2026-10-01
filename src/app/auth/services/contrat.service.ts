import { HttpClient } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import { catchError, map, Observable, of } from 'rxjs';
import {
  Contrat,
  ContratMeta,
  ContratPayload,
  TypePersonnel,
  VerificationContrat
} from 'src/app/interfaces/Contrat';
import {
  LaravelApiResponse,
  PaginationMeta,
  initialPaginationMeta
} from 'src/app/response-type/Type';
import { environment } from 'src/environments/environment';

/** Filtres acceptés par la liste des contrats. */
export interface ContratFiltres {
  statut?: string;
  type_contrat?: string;
  contractable_type?: string;
  /** Ne garder que les contrats arrivant à terme dans les N prochains jours. */
  echeance_dans?: number;
}

@Injectable({
  providedIn: 'root'
})
export class ContratService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiUrl.replace(/\/+$/, '');

  private contratsSignal = signal<Contrat[]>([]);
  private metaSignal = signal<PaginationMeta>(initialPaginationMeta);

  readonly contrats = this.contratsSignal.asReadonly();
  readonly meta = this.metaSignal.asReadonly();

  getList(
    page = 1,
    perPage = 10,
    search = '',
    filtres: ContratFiltres = {}
  ): Observable<Contrat[]> {
    // Un filtre vide ne doit pas partir en paramètre : le serveur le lirait
    // comme une valeur à filtrer et ne renverrait plus rien.
    const params: Record<string, string | number> = {
      page,
      per_page: perPage,
      search
    };

    Object.entries(filtres).forEach(([cle, valeur]) => {
      if (valeur !== null && valeur !== undefined && valeur !== '') {
        params[cle] = valeur;
      }
    });

    return this.http
      .get<LaravelApiResponse<Contrat[]>>(`${this.baseUrl}/contrats/list`, {
        params
      })
      .pipe(
        map((response) => {
          const data = response.payload ?? [];
          this.contratsSignal.set(data);
          if (response.meta) this.metaSignal.set(response.meta);
          return data;
        }),
        catchError((error) => {
          console.error('Erreur chargement contrats:', error);
          return of([]);
        })
      );
  }

  /** Référentiels (types, statuts) pour alimenter les listes déroulantes. */
  getMeta(): Observable<ContratMeta | null> {
    return this.http
      .get<LaravelApiResponse<ContratMeta>>(`${this.baseUrl}/contrats/meta`)
      .pipe(
        map((response) => response.payload ?? null),
        catchError((error) => {
          console.error('Erreur chargement référentiels contrats:', error);
          return of(null);
        })
      );
  }

  getById(id: number): Observable<Contrat | null> {
    return this.http
      .get<LaravelApiResponse<Contrat>>(`${this.baseUrl}/contrats/show/${id}`)
      .pipe(
        map((response) => response.payload ?? null),
        catchError((error) => {
          console.error('Erreur chargement contrat:', error);
          return of(null);
        })
      );
  }

  /** Tout l'historique contractuel d'un membre du personnel. */
  getHistorique(type: TypePersonnel, id: number): Observable<Contrat[]> {
    return this.http
      .get<LaravelApiResponse<Contrat[]>>(
        `${this.baseUrl}/contrats/historique/${type}/${id}`
      )
      .pipe(
        map((response) => response.payload ?? []),
        catchError((error) => {
          console.error('Erreur chargement historique des contrats:', error);
          return of([]);
        })
      );
  }

  create(
    data: ContratPayload & {
      contractable_type: TypePersonnel;
      contractable_id: number;
      date_debut: string;
    }
  ): Observable<LaravelApiResponse<Contrat>> {
    return this.http.post<LaravelApiResponse<Contrat>>(
      `${this.baseUrl}/contrats/add`,
      data
    );
  }

  update(
    id: number,
    data: ContratPayload & { statut?: 'ACTIF' | 'SUSPENDU' }
  ): Observable<LaravelApiResponse<Contrat>> {
    return this.http.put<LaravelApiResponse<Contrat>>(
      `${this.baseUrl}/contrats/update/${id}`,
      data
    );
  }

  /** Met fin au contrat avant son terme. Le motif est exigé par le serveur. */
  resilier(
    id: number,
    data: { date_resiliation?: string | null; motif_resiliation: string }
  ): Observable<LaravelApiResponse<Contrat>> {
    return this.http.post<LaravelApiResponse<Contrat>>(
      `${this.baseUrl}/contrats/resilier/${id}`,
      data
    );
  }

  /**
   * Ouvre le contrat suivant et clôt le précédent. Les champs omis reprennent
   * les conditions de l'ancien contrat.
   */
  renouveler(
    id: number,
    data: ContratPayload
  ): Observable<LaravelApiResponse<Contrat>> {
    return this.http.post<LaravelApiResponse<Contrat>>(
      `${this.baseUrl}/contrats/renouveler/${id}`,
      data
    );
  }

  delete(id: number): Observable<LaravelApiResponse<null>> {
    return this.http.delete<LaravelApiResponse<null>>(
      `${this.baseUrl}/contrats/delete/${id}`
    );
  }

  /** Télécharge le contrat de travail en PDF (réponse binaire). */
  downloadPdf(id: number): Observable<Blob> {
    return this.http.get(`${this.baseUrl}/contrats/pdf/${id}`, {
      responseType: 'blob'
    });
  }

  /**
   * Vérifie l'authenticité d'un contrat depuis le code porté par son QR code.
   *
   * Appelée par la page publique : le visiteur n'est pas authentifié, et un
   * code inconnu (404) n'est pas une erreur mais une réponse — le document
   * présenté ne correspond à rien d'enregistré.
   */
  verifier(code: string): Observable<VerificationContrat | null> {
    return this.http
      .get<LaravelApiResponse<VerificationContrat>>(
        `${this.baseUrl}/verification-contrat/${code}`
      )
      .pipe(
        map((response) => response.payload ?? null),
        catchError(() => of(null))
      );
  }
}
