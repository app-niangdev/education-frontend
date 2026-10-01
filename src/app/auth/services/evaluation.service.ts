import { HttpClient } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import { catchError, map, Observable, of } from 'rxjs';
import { Affectation } from 'src/app/interfaces/ClasseMatiere';
import {
  Evaluation,
  EvaluationMeta,
  EvaluationPayload,
  EvaluationUpdatePayload,
  GradeSheet,
  NoteInput
} from 'src/app/interfaces/Evaluation';
import {
  LaravelApiResponse,
  PaginationMeta,
  initialPaginationMeta
} from 'src/app/response-type/Type';
import { environment } from 'src/environments/environment';

/**
 * Évaluations par période et saisie des notes.
 *
 * La liste est automatiquement bornée à l'enseignant connecté côté backend ;
 * un manager/admin reçoit toutes les évaluations. De même, /mes-affectations
 * ne renvoie que les couples (classe × matière) que l'utilisateur peut noter.
 */
@Injectable({
  providedIn: 'root'
})
export class EvaluationService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiUrl.replace(/\/+$/, '');

  private evaluationsSignal = signal<Evaluation[]>([]);
  private metaSignal = signal<PaginationMeta>(initialPaginationMeta);

  readonly evaluations = this.evaluationsSignal.asReadonly();
  readonly meta = this.metaSignal.asReadonly();

  getList(
    page = 1,
    perPage = 10,
    search = '',
    periodeId?: number | null,
    affectationId?: number | null
  ): Observable<Evaluation[]> {
    const params: Record<string, string | number> = {
      page,
      per_page: perPage,
      search
    };
    if (periodeId) params['periode_id'] = periodeId;
    if (affectationId) params['affectation_id'] = affectationId;

    return this.http
      .get<LaravelApiResponse<Evaluation[]>>(`${this.baseUrl}/evaluations/list`, {
        params
      })
      .pipe(
        map((response) => {
          const data = response.payload ?? [];
          this.evaluationsSignal.set(data);
          if (response.meta) this.metaSignal.set(response.meta);
          return data;
        }),
        catchError((error) => {
          console.error('Erreur chargement évaluations:', error);
          return of([]);
        })
      );
  }

  /** Les affectations sur lesquelles l'utilisateur connecté peut créer des évaluations. */
  getMesAffectations(): Observable<Affectation[]> {
    return this.http
      .get<LaravelApiResponse<Affectation[]>>(
        `${this.baseUrl}/evaluations/mes-affectations`
      )
      .pipe(
        map((response) => response.payload ?? []),
        catchError((error) => {
          console.error('Erreur chargement affectations:', error);
          return of([]);
        })
      );
  }

  /** Barème par défaut et types d'évaluation, pour préremplir le formulaire. */
  getMeta(): Observable<EvaluationMeta | null> {
    return this.http
      .get<LaravelApiResponse<EvaluationMeta>>(`${this.baseUrl}/evaluations/meta`)
      .pipe(
        map((response) => response.payload ?? null),
        catchError((error) => {
          console.error('Erreur chargement métadonnées évaluations:', error);
          return of(null);
        })
      );
  }

  getById(id: number): Observable<Evaluation | null> {
    return this.http
      .get<LaravelApiResponse<Evaluation>>(`${this.baseUrl}/evaluations/show/${id}`)
      .pipe(
        map((response) => response.payload ?? null),
        catchError((error) => {
          console.error('Erreur chargement évaluation:', error);
          return of(null);
        })
      );
  }

  /** L'évaluation + la grille des élèves de la classe avec leurs notes. */
  getGradeSheet(id: number): Observable<GradeSheet | null> {
    return this.http
      .get<LaravelApiResponse<GradeSheet>>(
        `${this.baseUrl}/evaluations/grade-sheet/${id}`
      )
      .pipe(
        map((response) => response.payload ?? null),
        catchError((error) => {
          console.error('Erreur chargement grille de notes:', error);
          return of(null);
        })
      );
  }

  create(payload: EvaluationPayload): Observable<LaravelApiResponse<Evaluation>> {
    return this.http.post<LaravelApiResponse<Evaluation>>(
      `${this.baseUrl}/evaluations/add`,
      payload
    );
  }

  update(
    id: number,
    payload: EvaluationUpdatePayload
  ): Observable<LaravelApiResponse<Evaluation>> {
    return this.http.put<LaravelApiResponse<Evaluation>>(
      `${this.baseUrl}/evaluations/update/${id}`,
      payload
    );
  }

  delete(id: number): Observable<LaravelApiResponse<null>> {
    return this.http.delete<LaravelApiResponse<null>>(
      `${this.baseUrl}/evaluations/delete/${id}`
    );
  }

  /** Saisie/mise à jour en lot des notes. Renvoie la grille rafraîchie. */
  saveNotes(
    id: number,
    notes: NoteInput[]
  ): Observable<LaravelApiResponse<GradeSheet>> {
    return this.http.post<LaravelApiResponse<GradeSheet>>(
      `${this.baseUrl}/evaluations/save-notes/${id}`,
      { notes }
    );
  }
}
