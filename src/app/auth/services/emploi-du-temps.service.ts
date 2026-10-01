import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { catchError, map, Observable, of } from 'rxjs';
import {
  EmploiDuTemps,
  EmploiDuTempsPayload,
  EmploiDuTempsUpdatePayload
} from 'src/app/interfaces/EmploiDuTemps';
import { LaravelApiResponse } from 'src/app/response-type/Type';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root'
})
export class EmploiDuTempsService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiUrl.replace(/\/+$/, '');

  getByClasse(classeId: number): Observable<EmploiDuTemps[]> {
    return this.http
      .get<LaravelApiResponse<EmploiDuTemps[]>>(
        `${this.baseUrl}/emploi-du-temps/by-classe/${classeId}`
      )
      .pipe(
        map((response) => response.payload ?? []),
        catchError((error) => {
          console.error("Erreur chargement emploi du temps:", error);
          return of([]);
        })
      );
  }

  create(
    payload: EmploiDuTempsPayload
  ): Observable<LaravelApiResponse<EmploiDuTemps>> {
    return this.http.post<LaravelApiResponse<EmploiDuTemps>>(
      `${this.baseUrl}/emploi-du-temps/add`,
      payload
    );
  }

  update(
    id: number,
    payload: EmploiDuTempsUpdatePayload
  ): Observable<LaravelApiResponse<EmploiDuTemps>> {
    return this.http.put<LaravelApiResponse<EmploiDuTemps>>(
      `${this.baseUrl}/emploi-du-temps/update/${id}`,
      payload
    );
  }

  delete(id: number): Observable<LaravelApiResponse<null>> {
    return this.http.delete<LaravelApiResponse<null>>(
      `${this.baseUrl}/emploi-du-temps/delete/${id}`
    );
  }

  /** Telecharge le PDF de l'emploi du temps (reponse binaire). */
  downloadPdf(classeId: number): Observable<Blob> {
    return this.http.get(`${this.baseUrl}/emploi-du-temps/pdf/${classeId}`, {
      responseType: 'blob'
    });
  }
}
