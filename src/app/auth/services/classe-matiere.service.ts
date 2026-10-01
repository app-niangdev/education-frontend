import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { catchError, map, Observable, of } from 'rxjs';
import {
  ClasseMatiere,
  ClasseMatierePayload,
  ClasseMatiereUpdatePayload
} from 'src/app/interfaces/ClasseMatiere';
import { LaravelApiResponse } from 'src/app/response-type/Type';
import { environment } from 'src/environments/environment';

/**
 * Programme d'une classe : quelles matieres y sont enseignees et avec quel
 * coefficient / volume horaire (propres a la classe).
 */
@Injectable({
  providedIn: 'root'
})
export class ClasseMatiereService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiUrl.replace(/\/+$/, '');

  /** Le programme d'une classe, avec l'enseignant affecte a chaque matiere. */
  getByClasse(classeId: number): Observable<ClasseMatiere[]> {
    return this.http
      .get<LaravelApiResponse<ClasseMatiere[]>>(
        `${this.baseUrl}/classe-matieres/by-classe/${classeId}`
      )
      .pipe(
        map((response) => response.payload ?? []),
        catchError((error) => {
          console.error('Erreur chargement programme de la classe:', error);
          return of([]);
        })
      );
  }

  create(
    payload: ClasseMatierePayload
  ): Observable<LaravelApiResponse<ClasseMatiere>> {
    return this.http.post<LaravelApiResponse<ClasseMatiere>>(
      `${this.baseUrl}/classe-matieres/add`,
      payload
    );
  }

  update(
    id: number,
    payload: ClasseMatiereUpdatePayload
  ): Observable<LaravelApiResponse<ClasseMatiere>> {
    return this.http.put<LaravelApiResponse<ClasseMatiere>>(
      `${this.baseUrl}/classe-matieres/update/${id}`,
      payload
    );
  }

  delete(id: number): Observable<LaravelApiResponse<null>> {
    return this.http.delete<LaravelApiResponse<null>>(
      `${this.baseUrl}/classe-matieres/delete/${id}`
    );
  }

  /**
   * Fixe l'ordre d'affichage des matieres, celui que suivra le bulletin.
   * `ids` doit lister le programme au complet, dans l'ordre voulu.
   */
  reordonner(
    classeId: number,
    ids: number[]
  ): Observable<LaravelApiResponse<ClasseMatiere[]>> {
    return this.http.put<LaravelApiResponse<ClasseMatiere[]>>(
      `${this.baseUrl}/classe-matieres/reordonner/${classeId}`,
      { ids }
    );
  }
}
