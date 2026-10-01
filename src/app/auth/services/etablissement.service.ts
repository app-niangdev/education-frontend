import { HttpClient } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import {
  catchError,
  finalize,
  map,
  Observable,
  of,
  shareReplay
} from 'rxjs';
import { Etablissement } from 'src/app/interfaces/Etablissement';
import { LaravelApiResponse } from 'src/app/response-type/Type';
import { environment } from 'src/environments/environment';
import { ThemeColorService } from './theme-color.service';

@Injectable({
  providedIn: 'root'
})
export class EtablissementService {
  private readonly http = inject(HttpClient);
  private readonly themeColor = inject(ThemeColorService);
  private readonly baseUrl = environment.apiUrl.replace(/\/+$/, '');
  private etablissementSignal = signal<Etablissement | null>(null);
  private loadingSignal = signal(false);
  private errorSignal = signal<string | null>(null);
  private emptySignal = signal(false);
  readonly etablissement = this.etablissementSignal.asReadonly();
  /** Vrai uniquement pendant la requête : évite le loader infini quand la réponse est vide. */
  readonly loading = this.loadingSignal.asReadonly();
  readonly error = this.errorSignal.asReadonly();
  /**
   * Vrai quand l'API répond correctement mais qu'aucun établissement n'existe :
   * on propose alors la création plutôt qu'un simple « Réessayer ».
   */
  readonly empty = this.emptySignal.asReadonly();

  /** Requête en cours partagée pour éviter les appels concurrents en double. */
  private inFlight$: Observable<Etablissement | null> | null = null;

  getInfoEtablissement(): Observable<Etablissement | null> {
    // Si une requête est déjà en cours, on la partage au lieu d'en lancer une autre.
    if (this.inFlight$) {
      return this.inFlight$;
    }

    this.loadingSignal.set(true);
    this.errorSignal.set(null);
    this.emptySignal.set(false);

    this.inFlight$ = this.http
      .get<LaravelApiResponse<Etablissement>>(
        `${this.baseUrl}/etablissement/infos`
      )
      .pipe(
        map((response) => {
          const data = response.payload ?? null;
          this.etablissementSignal.set(data);
          this.emptySignal.set(!data);
          // Endpoint public : permet d'appliquer la couleur sur la page d'accueil
          // meme sans etre connecte (si le backend l'expose).
          this.themeColor.syncFromBackend(data?.code_couleur);
          return data;
        }),
        catchError((error) => {
          this.etablissementSignal.set(null);

          // Le back renvoie 404 tant qu'aucun établissement n'a été créé :
          // ce n'est pas une panne, c'est un état vide à faire remplir.
          if (error?.status === 404) {
            this.emptySignal.set(true);
          } else {
            console.error('Erreur chargement établissement:', error);
            this.errorSignal.set(
              "Impossible de charger les informations de l'établissement."
            );
          }
          return of(null);
        }),
        finalize(() => {
          this.loadingSignal.set(false);
          this.inFlight$ = null;
        }),
        shareReplay(1)
      );

    return this.inFlight$;
  }

  /**
   * Envoie un message depuis le formulaire de contact de la page d'accueil.
   *
   * Le destinataire n'est pas transmis : le backend l'a lu sur l'établissement.
   * `email` est l'adresse du visiteur, elle sert d'adresse de réponse.
   */
  envoyerMessageContact(payload: {
    email: string;
    titre: string;
    message: string;
  }): Observable<void> {
    return this.http
      .post<LaravelApiResponse<null>>(
        `${this.baseUrl}/etablissement/contact`,
        payload
      )
      .pipe(map(() => void 0));
  }

  /** Taille maximale acceptée pour le logo : 2 Mo (aligné sur la validation Laravel max:2048). */
  static readonly LOGO_MAX_SIZE = 2 * 1024 * 1024;
  static readonly LOGO_ACCEPTED_TYPES = [
    'image/jpeg',
    'image/png',
    'image/jpg',
    'image/svg+xml',
    'image/webp'
  ];

  updateLogo(id: number, logo: File): Observable<Etablissement | null> {
    const formData = new FormData();
    formData.append('logo', logo);

    return this.http
      .post<LaravelApiResponse<Etablissement>>(
        `${this.baseUrl}/etablissement/logo/${id}`,
        formData
      )
      .pipe(
        map((response) => {
          const data = response.payload ?? null;
          this.etablissementSignal.set(data);
          return data;
        })
      );
  }

  /** Enregistre l'établissement initial (aucun n'existe encore en base). */
  createEtablissement(
    etablissement: Omit<Etablissement, 'id' | 'logo'>
  ): Observable<Etablissement | null> {
    return this.http
      .post<LaravelApiResponse<Etablissement>>(
        `${this.baseUrl}/etablissement/store`,
        etablissement
      )
      .pipe(
        map((response) => {
          const data = response.payload ?? null;
          if (data) {
            this.etablissementSignal.set(data);
            this.errorSignal.set(null);
            this.emptySignal.set(false);
          }
          return data;
        })
      );
  }

  /**
   * Met à jour les champs texte de l'établissement.
   *
   * Le payload ne contient QUE les champs édités : le back valide `logo` avec la
   * règle `image`, donc renvoyer le logo (une URL, donc une chaîne) faisait
   * échouer la requête en 422 même quand seul le nom changeait.
   */
  updateInfos(
    id: number,
    changes: Partial<Omit<Etablissement, 'id' | 'logo'>>
  ): Observable<Etablissement | null> {
    return this.http
      .patch<LaravelApiResponse<Etablissement>>(
        `${this.baseUrl}/etablissement/update/${id}`,
        changes
      )
      .pipe(
        map((response) => {
          const data = response.payload ?? null;
          if (data) {
            this.etablissementSignal.set(data);
            this.errorSignal.set(null);
            this.emptySignal.set(false);
          }
          return data;
        })
      );
  }
}
