import { HttpClient } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import { catchError, map, Observable, of } from 'rxjs';
import {
  AssiduiteMeta,
  CorrigerPresencePayload,
  DashboardAssiduite,
  EnregistrerAppelPayload,
  FeuilleAppel,
  FicheAssiduiteEleve,
  JourneeAppel,
  JustifierPayload,
  Presence,
  SeanceAppel,
  StatutPresence
} from 'src/app/interfaces/Assiduite';
import {
  LaravelApiResponse,
  PaginationMeta,
  initialPaginationMeta
} from 'src/app/response-type/Type';
import { environment } from 'src/environments/environment';

/**
 * Assiduité : appel par créneau, justification et suivi.
 *
 * Le périmètre est borné côté backend : un enseignant ne voit que ses classes
 * et ne peut faire l'appel que sur ses propres créneaux, dans la semaine ; le
 * trésorier n'a aucun accès. Inutile de refaire ces contrôles ici.
 */
@Injectable({
  providedIn: 'root'
})
export class AssiduiteService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiUrl.replace(/\/+$/, '');

  private presencesSignal = signal<Presence[]>([]);
  private metaSignal = signal<PaginationMeta>(initialPaginationMeta);

  readonly presences = this.presencesSignal.asReadonly();
  readonly meta = this.metaSignal.asReadonly();

  /** Statuts de présence et de séance, et le délai de saisie enseignant. */
  getMeta(): Observable<AssiduiteMeta | null> {
    return this.http
      .get<LaravelApiResponse<AssiduiteMeta>>(`${this.baseUrl}/assiduite/meta`)
      .pipe(
        map((response) => response.payload ?? null),
        catchError((error) => {
          console.error('Erreur chargement métadonnées assiduité:', error);
          return of(null);
        })
      );
  }

  /**
   * Les créneaux d'une journée. Un enseignant reçoit les siens ; les autres
   * rôles toute l'école, éventuellement filtrée par classe.
   */
  getCreneauxDuJour(date: string, classeId?: number | null): Observable<JourneeAppel | null> {
    const params: Record<string, string | number> = { date };
    if (classeId) params['classe_id'] = classeId;

    return this.http
      .get<LaravelApiResponse<JourneeAppel>>(`${this.baseUrl}/assiduite/mes-creneaux`, {
        params
      })
      .pipe(
        map((response) => response.payload ?? null),
        catchError((error) => {
          console.error('Erreur chargement des créneaux:', error);
          return of(null);
        })
      );
  }

  /** La feuille d'appel d'un créneau à une date : élèves et anomalies saisies. */
  getFeuilleAppel(creneauId: number, date: string): Observable<FeuilleAppel | null> {
    return this.http
      .get<LaravelApiResponse<FeuilleAppel>>(`${this.baseUrl}/assiduite/feuille-appel`, {
        params: { emploi_du_temps_id: creneauId, date }
      })
      .pipe(
        map((response) => response.payload ?? null),
        catchError((error) => {
          console.error("Erreur chargement de la feuille d'appel:", error);
          return of(null);
        })
      );
  }

  enregistrerAppel(
    payload: EnregistrerAppelPayload
  ): Observable<LaravelApiResponse<SeanceAppel>> {
    return this.http.post<LaravelApiResponse<SeanceAppel>>(
      `${this.baseUrl}/assiduite/enregistrer-appel`,
      payload
    );
  }

  // ------------------------------------------------------------------
  // Registre
  // ------------------------------------------------------------------

  getList(
    page = 1,
    perPage = 10,
    search = '',
    classeId?: number | null,
    eleveId?: number | null,
    statut?: StatutPresence | null,
    justifie?: boolean | null,
    du?: string | null,
    au?: string | null
  ): Observable<Presence[]> {
    const params: Record<string, string | number | boolean> = {
      page,
      per_page: perPage,
      search
    };
    if (classeId) params['classe_id'] = classeId;
    if (eleveId) params['eleve_id'] = eleveId;
    if (statut) params['statut'] = statut;
    if (justifie !== null && justifie !== undefined) params['justifie'] = justifie;
    if (du) params['du'] = du;
    if (au) params['au'] = au;

    return this.http
      .get<LaravelApiResponse<Presence[]>>(`${this.baseUrl}/assiduite/list`, { params })
      .pipe(
        map((response) => {
          const data = response.payload ?? [];
          this.presencesSignal.set(data);
          if (response.meta) this.metaSignal.set(response.meta);
          return data;
        }),
        catchError((error) => {
          console.error("Erreur chargement du registre d'assiduité:", error);
          return of([]);
        })
      );
  }

  getById(id: number): Observable<Presence | null> {
    return this.http
      .get<LaravelApiResponse<Presence>>(`${this.baseUrl}/assiduite/show/${id}`)
      .pipe(
        map((response) => response.payload ?? null),
        catchError((error) => {
          console.error("Erreur chargement de l'anomalie:", error);
          return of(null);
        })
      );
  }

  /**
   * Justification, avec pièce jointe éventuelle.
   *
   * En POST et en multipart : PHP ne parse pas le corps d'un PUT multipart, et
   * le fichier ne parviendrait jamais au serveur.
   */
  justifier(
    id: number,
    payload: JustifierPayload,
    justificatif?: File | null
  ): Observable<LaravelApiResponse<Presence>> {
    const form = new FormData();
    form.append('justifie', payload.justifie ? '1' : '0');
    if (payload.motif) form.append('motif', payload.motif);
    if (justificatif) form.append('justificatif', justificatif);

    return this.http.post<LaravelApiResponse<Presence>>(
      `${this.baseUrl}/assiduite/justifier/${id}`,
      form
    );
  }

  corriger(
    id: number,
    payload: CorrigerPresencePayload
  ): Observable<LaravelApiResponse<Presence>> {
    return this.http.put<LaravelApiResponse<Presence>>(
      `${this.baseUrl}/assiduite/update/${id}`,
      payload
    );
  }

  delete(id: number): Observable<LaravelApiResponse<null>> {
    return this.http.delete<LaravelApiResponse<null>>(
      `${this.baseUrl}/assiduite/delete/${id}`
    );
  }

  // ------------------------------------------------------------------
  // Fiche élève, dashboard et PDF
  // ------------------------------------------------------------------

  getFicheEleve(
    eleveId: number,
    periodeId?: number | null
  ): Observable<FicheAssiduiteEleve | null> {
    const params: Record<string, string | number> = {};
    if (periodeId) params['periode_id'] = periodeId;

    return this.http
      .get<LaravelApiResponse<FicheAssiduiteEleve>>(
        `${this.baseUrl}/assiduite/fiche-eleve/${eleveId}`,
        { params }
      )
      .pipe(
        map((response) => response.payload ?? null),
        catchError((error) => {
          console.error("Erreur chargement de la fiche d'assiduité:", error);
          return of(null);
        })
      );
  }

  getDashboard(
    date?: string | null,
    periodeId?: number | null
  ): Observable<DashboardAssiduite | null> {
    const params: Record<string, string | number> = {};
    if (date) params['date'] = date;
    if (periodeId) params['periode_id'] = periodeId;

    return this.http
      .get<LaravelApiResponse<DashboardAssiduite>>(
        `${this.baseUrl}/assiduite/dashboard-surveillant`,
        { params }
      )
      .pipe(
        map((response) => response.payload ?? null),
        catchError((error) => {
          console.error("Erreur chargement du tableau de bord d'assiduité:", error);
          return of(null);
        })
      );
  }

  downloadFicheElevePdf(eleveId: number, periodeId?: number | null): Observable<Blob> {
    const params: Record<string, string | number> = {};
    if (periodeId) params['periode_id'] = periodeId;

    return this.http.get(`${this.baseUrl}/assiduite/fiche-eleve-pdf/${eleveId}`, {
      params,
      responseType: 'blob'
    });
  }

  /** Feuille d'appel vierge, à imprimer pour un appel papier. */
  downloadFeuilleViergePdf(classeId: number, date: string): Observable<Blob> {
    return this.http.get(`${this.baseUrl}/assiduite/feuille-vierge-pdf`, {
      params: { classe_id: classeId, date },
      responseType: 'blob'
    });
  }
}
