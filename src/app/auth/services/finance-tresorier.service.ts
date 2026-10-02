import { HttpClient } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import { catchError, map, Observable, of } from 'rxjs';
import { Inscription } from 'src/app/interfaces/Inscription';
import {
  FactureMensualite,
  Mensualite,
  PaiementMensualite,
  PayerFacturePayload,
  PayerMensualitePayload
} from 'src/app/interfaces/Mensualite';
import {
  PaiementInscription,
  ValiderInscriptionPayload
} from 'src/app/interfaces/Paiement';
import {
  DebiteursPayload,
  RelanceHistorique,
  RelanceResultat
} from 'src/app/interfaces/Relance';
import {
  LaravelApiResponse,
  PaginationMeta,
  initialPaginationMeta
} from 'src/app/response-type/Type';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root'
})
export class FinanceTresorierService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiUrl.replace(/\/+$/, '');

  private aEncaisserSignal = signal<Inscription[]>([]);
  private aEncaisserMetaSignal = signal<PaginationMeta>(initialPaginationMeta);

  private paiementsSignal = signal<PaiementInscription[]>([]);
  private paiementsMetaSignal = signal<PaginationMeta>(initialPaginationMeta);

  private mensualitesSignal = signal<Mensualite[]>([]);
  private mensualitesMetaSignal = signal<PaginationMeta>(initialPaginationMeta);

  // Vue regroupee par eleve : une inscription porte son echeancier complet.
  private inscriptionsMensualitesSignal = signal<Inscription[]>([]);
  private inscriptionsMensualitesMetaSignal = signal<PaginationMeta>(initialPaginationMeta);

  // Factures multi-mois emises sur l'annee en cours.
  private facturesSignal = signal<FactureMensualite[]>([]);
  private facturesMetaSignal = signal<PaginationMeta>(initialPaginationMeta);

  readonly aEncaisser = this.aEncaisserSignal.asReadonly();
  readonly aEncaisserMeta = this.aEncaisserMetaSignal.asReadonly();

  readonly paiements = this.paiementsSignal.asReadonly();
  readonly paiementsMeta = this.paiementsMetaSignal.asReadonly();

  readonly mensualites = this.mensualitesSignal.asReadonly();
  readonly mensualitesMeta = this.mensualitesMetaSignal.asReadonly();

  readonly inscriptionsMensualites = this.inscriptionsMensualitesSignal.asReadonly();
  readonly inscriptionsMensualitesMeta = this.inscriptionsMensualitesMetaSignal.asReadonly();

  readonly factures = this.facturesSignal.asReadonly();
  readonly facturesMeta = this.facturesMetaSignal.asReadonly();

  /**
   * Inscriptions restant a encaisser (non annulees, non soldees) de l'annee
   * en cours : EN_ATTENTE a valider, ou VALIDEE partiellement payees.
   */
  getAEncaisser(page = 1, perPage = 10, search = ''): Observable<Inscription[]> {
    return this.http
      .get<LaravelApiResponse<Inscription[]>>(
        `${this.baseUrl}/finance-tresorier/inscriptions/a-encaisser`,
        { params: { page, per_page: perPage, search } }
      )
      .pipe(
        map((response) => {
          const data = response.payload ?? [];
          this.aEncaisserSignal.set(data);
          if (response.meta) this.aEncaisserMetaSignal.set(response.meta);
          return data;
        }),
        catchError((error) => {
          console.error('Erreur chargement inscriptions à encaisser:', error);
          return of([]);
        })
      );
  }

  /**
   * Encaisse un versement et valide l'inscription. Le backend refuse un
   * montant nul, superieur au reste, ou sur une inscription annulee/soldee.
   */
  valider(
    inscriptionId: number,
    data: ValiderInscriptionPayload
  ): Observable<LaravelApiResponse<Inscription>> {
    return this.http.post<LaravelApiResponse<Inscription>>(
      `${this.baseUrl}/finance-tresorier/inscriptions/valider/${inscriptionId}`,
      data
    );
  }

  getPaiements(page = 1, perPage = 10, search = ''): Observable<PaiementInscription[]> {
    return this.http
      .get<LaravelApiResponse<PaiementInscription[]>>(
        `${this.baseUrl}/finance-tresorier/paiements/list`,
        { params: { page, per_page: perPage, search } }
      )
      .pipe(
        map((response) => {
          const data = response.payload ?? [];
          this.paiementsSignal.set(data);
          if (response.meta) this.paiementsMetaSignal.set(response.meta);
          return data;
        }),
        catchError((error) => {
          console.error('Erreur chargement paiements:', error);
          return of([]);
        })
      );
  }

  getPaiementById(id: number): Observable<PaiementInscription | null> {
    return this.http
      .get<LaravelApiResponse<PaiementInscription>>(
        `${this.baseUrl}/finance-tresorier/paiements/show/${id}`
      )
      .pipe(
        map((response) => response.payload ?? null),
        catchError((error) => {
          console.error('Erreur chargement paiement:', error);
          return of(null);
        })
      );
  }

  /**
   * Justificatif PDF d'un versement sur inscription. Le backend décide de la
   * nature du document : reçu de paiement si l'inscription est soldée après ce
   * versement, décharge tant qu'un reste est exigible.
   */
  downloadRecuInscriptionPdf(paiementId: number): Observable<Blob> {
    return this.http.get(
      `${this.baseUrl}/finance-tresorier/paiements/recu-pdf/${paiementId}`,
      { responseType: 'blob' }
    );
  }

  /**
   * Renvoie au tuteur, sur WhatsApp, le justificatif d'un versement sur
   * inscription. L'envoi automatique suit déjà chaque encaissement : ce renvoi
   * sert quand il a échoué, ou que la famille réclame de nouveau son document.
   */
  envoyerRecuInscriptionWhatsapp(
    paiementId: number
  ): Observable<LaravelApiResponse<null>> {
    return this.http.post<LaravelApiResponse<null>>(
      `${this.baseUrl}/finance-tresorier/paiements/whatsapp/${paiementId}`,
      {}
    );
  }

  // ─── Mensualités ────────────────────────────────────────────────────────────

  /**
   * Mensualités regroupées par élève : une inscription (avec son échéancier
   * complet) par ligne, pour l'année en cours. Vue principale du trésorier.
   */
  getInscriptionsMensualites(page = 1, perPage = 10, search = ''): Observable<Inscription[]> {
    return this.http
      .get<LaravelApiResponse<Inscription[]>>(
        `${this.baseUrl}/finance-tresorier/mensualites/par-eleve`,
        { params: { page, per_page: perPage, search } }
      )
      .pipe(
        map((response) => {
          const data = response.payload ?? [];
          this.inscriptionsMensualitesSignal.set(data);
          if (response.meta) this.inscriptionsMensualitesMetaSignal.set(response.meta);
          return data;
        }),
        catchError((error) => {
          console.error('Erreur chargement mensualités par élève:', error);
          return of([]);
        })
      );
  }

  /**
   * Versement global sur un élève, réparti automatiquement sur ses mensualités
   * non soldées (des plus anciennes aux plus récentes). Le backend refuse un
   * montant nul ou supérieur au reste total.
   */
  payerMensualitesReparti(
    inscriptionId: number,
    data: PayerMensualitePayload
  ): Observable<LaravelApiResponse<Inscription>> {
    return this.http.post<LaravelApiResponse<Inscription>>(
      `${this.baseUrl}/finance-tresorier/mensualites/payer-reparti/${inscriptionId}`,
      data
    );
  }

  /** Mensualités restant à encaisser (non soldées) de l'année en cours. */
  getMensualitesAEncaisser(page = 1, perPage = 10, search = ''): Observable<Mensualite[]> {
    return this.http
      .get<LaravelApiResponse<Mensualite[]>>(
        `${this.baseUrl}/finance-tresorier/mensualites/a-encaisser`,
        { params: { page, per_page: perPage, search } }
      )
      .pipe(
        map((response) => {
          const data = response.payload ?? [];
          this.mensualitesSignal.set(data);
          if (response.meta) this.mensualitesMetaSignal.set(response.meta);
          return data;
        }),
        catchError((error) => {
          console.error('Erreur chargement mensualités à encaisser:', error);
          return of([]);
        })
      );
  }

  /**
   * Encaisse un versement (éventuellement partiel) sur une mensualité. Le
   * backend refuse un montant nul, supérieur au reste, ou sur une mensualité
   * déjà soldée / d'une inscription annulée.
   */
  payerMensualite(
    mensualiteId: number,
    data: PayerMensualitePayload
  ): Observable<LaravelApiResponse<Mensualite>> {
    return this.http.post<LaravelApiResponse<Mensualite>>(
      `${this.baseUrl}/finance-tresorier/mensualites/payer/${mensualiteId}`,
      data
    );
  }

  getPaiementsMensualite(page = 1, perPage = 10, search = ''): Observable<PaiementMensualite[]> {
    return this.http
      .get<LaravelApiResponse<PaiementMensualite[]>>(
        `${this.baseUrl}/finance-tresorier/mensualites/paiements/list`,
        { params: { page, per_page: perPage, search } }
      )
      .pipe(
        map((response) => response.payload ?? []),
        catchError((error) => {
          console.error('Erreur chargement paiements de mensualité:', error);
          return of([]);
        })
      );
  }

  /**
   * Justificatif PDF d'un versement sur mensualité. Le backend décide de la
   * nature du document : reçu de paiement si le mois est soldé après ce
   * versement, décharge tant qu'un reste est exigible sur ce mois.
   */
  downloadRecuMensualitePdf(paiementId: number): Observable<Blob> {
    return this.http.get(
      `${this.baseUrl}/finance-tresorier/mensualites/paiements/recu-pdf/${paiementId}`,
      { responseType: 'blob' }
    );
  }

  // ─── Factures multi-mois ────────────────────────────────────────────────────

  /**
   * Encaisse plusieurs mois sur une seule facture. En mode AUTOMATIQUE le
   * montant saisi est réparti en cascade par le serveur ; en mode SELECTION,
   * les mois cochés et leurs montants sont envoyés tels quels. Le backend
   * refuse tout dépassement du reste dû (vérifié sous verrou).
   */
  payerFactureMensualites(
    inscriptionId: number,
    data: PayerFacturePayload
  ): Observable<LaravelApiResponse<FactureMensualite>> {
    return this.http.post<LaravelApiResponse<FactureMensualite>>(
      `${this.baseUrl}/finance-tresorier/mensualites/factures/payer/${inscriptionId}`,
      data
    );
  }

  getFacturesMensualite(page = 1, perPage = 10, search = ''): Observable<FactureMensualite[]> {
    return this.http
      .get<LaravelApiResponse<FactureMensualite[]>>(
        `${this.baseUrl}/finance-tresorier/mensualites/factures/list`,
        { params: { page, per_page: perPage, search } }
      )
      .pipe(
        map((response) => {
          const data = response.payload ?? [];
          this.facturesSignal.set(data);
          if (response.meta) this.facturesMetaSignal.set(response.meta);
          return data;
        }),
        catchError((error) => {
          console.error('Erreur chargement factures de mensualité:', error);
          return of([]);
        })
      );
  }

  getFactureById(id: number): Observable<FactureMensualite | null> {
    return this.http
      .get<LaravelApiResponse<FactureMensualite>>(
        `${this.baseUrl}/finance-tresorier/mensualites/factures/show/${id}`
      )
      .pipe(
        map((response) => response.payload ?? null),
        catchError((error) => {
          console.error('Erreur chargement facture:', error);
          return of(null);
        })
      );
  }

  /**
   * Justificatif PDF unique d'une facture multi-mois : un seul document
   * détaillant chaque mois réglé, au lieu d'un PDF par mois.
   */
  downloadFacturePdf(factureId: number): Observable<Blob> {
    return this.http.get(
      `${this.baseUrl}/finance-tresorier/mensualites/factures/pdf/${factureId}`,
      { responseType: 'blob' }
    );
  }

  /** Renvoie au tuteur, sur WhatsApp, le justificatif d'une facture multi-mois. */
  envoyerFactureWhatsapp(
    factureId: number
  ): Observable<LaravelApiResponse<null>> {
    return this.http.post<LaravelApiResponse<null>>(
      `${this.baseUrl}/finance-tresorier/mensualites/factures/whatsapp/${factureId}`,
      {}
    );
  }

  // ─── Relances des impayés ───────────────────────────────────────────────────

  /**
   * Familles en retard de paiement sur l'année en cours : reste des frais
   * d'inscription et mensualités échues non soldées, regroupés par tuteur.
   */
  getDebiteurs(): Observable<DebiteursPayload> {
    return this.http
      .get<LaravelApiResponse<DebiteursPayload>>(
        `${this.baseUrl}/finance-tresorier/relances/debiteurs`
      )
      .pipe(map((response) => response.payload));
  }

  /**
   * Relance une famille sur WhatsApp. Le serveur recalcule les arriérés et
   * refuse (422) une relance sans objet ; 503 signale un service en panne.
   */
  relancerTuteur(
    tuteurId: number
  ): Observable<LaravelApiResponse<RelanceResultat>> {
    return this.http.post<LaravelApiResponse<RelanceResultat>>(
      `${this.baseUrl}/finance-tresorier/relances/envoyer/${tuteurId}`,
      {}
    );
  }

  /** Relances et rappels déjà envoyés, du plus récent au plus ancien. */
  getHistoriqueRelances(
    page = 1,
    perPage = 10,
    search = ''
  ): Observable<{ relances: RelanceHistorique[]; meta: PaginationMeta }> {
    return this.http
      .get<LaravelApiResponse<RelanceHistorique[]>>(
        `${this.baseUrl}/finance-tresorier/relances/historique`,
        { params: { page, per_page: perPage, search } }
      )
      .pipe(
        map((response) => ({
          relances: response.payload ?? [],
          meta: response.meta ?? initialPaginationMeta
        }))
      );
  }
}
