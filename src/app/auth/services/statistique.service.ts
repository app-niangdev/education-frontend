import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { catchError, map, Observable, of } from 'rxjs';
import {
  DashboardEnseignant,
  DashboardStats,
  DashboardTresorier
} from 'src/app/interfaces/Statistique';
import { LaravelApiResponse } from 'src/app/response-type/Type';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root'
})
export class StatistiqueService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiUrl.replace(/\/+$/, '');

  /**
   * Tableau de bord manager de l'année en cours (ou de l'année ciblée par
   * anneeScolaireId). Réservé admin/manager côté backend.
   */
  getDashboard(anneeScolaireId?: number): Observable<DashboardStats | null> {
    const params: Record<string, string> = anneeScolaireId
      ? { annee_scolaire_id: String(anneeScolaireId) }
      : {};

    return this.http
      .get<LaravelApiResponse<DashboardStats>>(
        `${this.baseUrl}/statistiques/dashboard`,
        { params }
      )
      .pipe(
        map((response) => response.payload ?? null),
        catchError((error) => {
          console.error('Erreur chargement statistiques:', error);
          return of(null);
        })
      );
  }

  /**
   * Tableau de bord financier du trésorier (année en cours ou ciblée).
   * Accessible au trésorier ; admin/manager y accèdent aussi.
   */
  getDashboardTresorier(anneeScolaireId?: number): Observable<DashboardTresorier | null> {
    const params: Record<string, string> = anneeScolaireId
      ? { annee_scolaire_id: String(anneeScolaireId) }
      : {};

    return this.http
      .get<LaravelApiResponse<DashboardTresorier>>(
        `${this.baseUrl}/statistiques/dashboard-tresorier`,
        { params }
      )
      .pipe(
        map((response) => response.payload ?? null),
        catchError((error) => {
          console.error('Erreur chargement statistiques trésorier:', error);
          return of(null);
        })
      );
  }

  /** Tableau de bord de l'enseignant connecté (affectations, évaluations, notes). */
  getDashboardEnseignant(anneeScolaireId?: number): Observable<DashboardEnseignant | null> {
    const params: Record<string, string> = anneeScolaireId
      ? { annee_scolaire_id: String(anneeScolaireId) }
      : {};

    return this.http
      .get<LaravelApiResponse<DashboardEnseignant>>(
        `${this.baseUrl}/statistiques/dashboard-enseignant`,
        { params }
      )
      .pipe(
        map((response) => response.payload ?? null),
        catchError((error) => {
          console.error('Erreur chargement statistiques enseignant:', error);
          return of(null);
        })
      );
  }
}
