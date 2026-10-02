import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { StatutWhatsapp } from 'src/app/interfaces/Relance';
import { LaravelApiResponse } from 'src/app/response-type/Type';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root'
})
export class WhatsappService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiUrl.replace(/\/+$/, '');

  /** État de la liaison WhatsApp : réservé à l'admin et au manager. */
  getStatut(): Observable<StatutWhatsapp> {
    return this.http
      .get<LaravelApiResponse<StatutWhatsapp>>(`${this.baseUrl}/whatsapp/statut`)
      .pipe(map((response) => response.payload));
  }
}
