import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { catchError, map, Observable, of } from 'rxjs';
import { Affectation, AffectationPayload } from 'src/app/interfaces/ClasseMatiere';
import { LaravelApiResponse } from 'src/app/response-type/Type';
import { environment } from 'src/environments/environment';

/**
 * Affectations : rattacher un enseignant a un couple (classe x matiere).
 * Un enseignant peut etre affecte a plusieurs matieres / classes.
 */
@Injectable({
  providedIn: 'root'
})
export class AffectationService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiUrl.replace(/\/+$/, '');

  getByEnseignant(enseignantId: number): Observable<Affectation[]> {
    return this.http
      .get<LaravelApiResponse<Affectation[]>>(
        `${this.baseUrl}/affectations/by-enseignant/${enseignantId}`
      )
      .pipe(
        map((response) => response.payload ?? []),
        catchError((error) => {
          console.error("Erreur chargement affectations de l'enseignant:", error);
          return of([]);
        })
      );
  }

  /** Affectations d'une classe : sert a alimenter le choix d'un creneau. */
  getByClasse(classeId: number): Observable<Affectation[]> {
    return this.http
      .get<LaravelApiResponse<Affectation[]>>(
        `${this.baseUrl}/affectations/by-classe/${classeId}`
      )
      .pipe(
        map((response) => response.payload ?? []),
        catchError((error) => {
          console.error('Erreur chargement affectations de la classe:', error);
          return of([]);
        })
      );
  }

  create(
    payload: AffectationPayload
  ): Observable<LaravelApiResponse<Affectation>> {
    return this.http.post<LaravelApiResponse<Affectation>>(
      `${this.baseUrl}/affectations/add`,
      payload
    );
  }

  update(
    id: number,
    payload: AffectationPayload
  ): Observable<LaravelApiResponse<Affectation>> {
    return this.http.put<LaravelApiResponse<Affectation>>(
      `${this.baseUrl}/affectations/update/${id}`,
      payload
    );
  }

  delete(id: number): Observable<LaravelApiResponse<null>> {
    return this.http.delete<LaravelApiResponse<null>>(
      `${this.baseUrl}/affectations/delete/${id}`
    );
  }
}
