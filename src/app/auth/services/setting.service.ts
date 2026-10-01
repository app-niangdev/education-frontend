import { HttpClient } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import { catchError, map, Observable, of } from 'rxjs';
import { Setting, SettingPayload } from 'src/app/interfaces/Setting';
import { LaravelApiResponse } from 'src/app/response-type/Type';
import { environment } from 'src/environments/environment';
import { ThemeColorService } from './theme-color.service';

@Injectable({
  providedIn: 'root'
})
export class SettingService {
  private readonly http = inject(HttpClient);
  private readonly themeColor = inject(ThemeColorService);
  private readonly baseUrl = environment.apiUrl.replace(/\/+$/, '');
  private settingSignal = signal<Setting | null>(null);
  readonly setting = this.settingSignal.asReadonly();

  getParametrage(): Observable<Setting | null> {
    return this.http
      .get<LaravelApiResponse<Setting>>(`${this.baseUrl}/parametrages/infos`)
      .pipe(
        map((response) => {
          const data = response.payload ?? null;
          this.settingSignal.set(data);
          // Le choix local prime : n'applique la couleur backend que si aucun
          // choix n'a encore ete enregistre sur cet appareil.
          this.themeColor.syncFromBackend(data?.code_couleur);
          return data;
        }),
        catchError((error) => {
          console.error('Erreur chargement paramétrage:', error);
          this.settingSignal.set(null);
          return of(null);
        })
      );
  }

  /**
   * Reservee a l'admin : le serveur repond 403 aux autres roles. Le signal est
   * rafraichi depuis la reponse, evitant un second aller-retour.
   */
  updateParametrage(
    setting: SettingPayload
  ): Observable<LaravelApiResponse<Setting>> {
    return this.http
      .put<LaravelApiResponse<Setting>>(
        `${this.baseUrl}/parametrages/update`,
        setting
      )
      .pipe(
        map((res) => {
          if (res.payload) {
            this.settingSignal.set(res.payload);
            this.themeColor.syncFromBackend(res.payload.code_couleur);
          }
          return res;
        })
      );
  }
}
