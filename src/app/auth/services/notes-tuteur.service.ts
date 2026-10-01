import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { EleveDuTuteur, ReleveNotes } from 'src/app/interfaces/NotesTuteur';
import { LaravelApiResponse } from 'src/app/response-type/Type';
import { environment } from 'src/environments/environment';

/**
 * Les résultats scolaires des enfants du tuteur connecté.
 *
 * Aucun identifiant de tuteur ne circule : le serveur lit le compte sur le
 * jeton et ne répond que sur ses propres enfants. Passer l'identifiant d'un
 * autre élève dans l'URL se solde par un 403.
 */
@Injectable({ providedIn: 'root' })
export class NotesTuteurService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiUrl.replace(/\/+$/, '');

  /** Les enfants rattachés au compte. Un tuteur en a souvent plusieurs. */
  mesEleves(): Observable<EleveDuTuteur[]> {
    return this.http
      .get<LaravelApiResponse<EleveDuTuteur[]>>(`${this.baseUrl}/mon-espace/eleves`)
      .pipe(map((res) => res.payload ?? []));
  }

  /**
   * Le relevé d'un enfant.
   *
   * Sans période précisée, le serveur retient celle en cours — ou la dernière
   * commencée, pour que la famille retrouve un relevé plutôt qu'un écran vide
   * entre deux trimestres.
   */
  releve(eleveId: number, periodeId?: number | null): Observable<ReleveNotes> {
    let params = new HttpParams();

    if (periodeId != null) {
      params = params.set('periode_id', periodeId);
    }

    return this.http
      .get<LaravelApiResponse<ReleveNotes>>(
        `${this.baseUrl}/mon-espace/eleves/${eleveId}/notes`,
        { params }
      )
      .pipe(map((res) => res.payload));
  }
}
