import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable, map, tap } from 'rxjs';
import { environment } from 'src/environments/environment';
import {
  JwtPayload,
  LoginApiResponse,
  LoginRequest,
  LogoutResponse,
  MeApiResponse,
  PasswordResetResponse,
  RefreshApiResponse,
  ResendOtpResponse,
  SessionData,
  TwoFactorResponse,
  UpdateProfilRequest,
  UserFromToken,
  VerifyOtpResponse
} from 'src/app/interfaces/Auth';
import { ResponseMessage } from 'src/app/response-type/Type';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly apiUrl = environment.apiUrl;
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);

  private readonly ACCESS_TOKEN_KEY = 'access_token';
  private readonly REFRESH_TOKEN_KEY = 'refresh_token';
  private readonly MENUS_KEY = 'user_menus';

  private userSubject = new BehaviorSubject<UserFromToken | null>(null);
  public user$ = this.userSubject.asObservable();

  constructor() {
    // Affichage immediat depuis le cache local. Le rafraichissement serveur
    // (refreshCurrentUser) est declenche apres le bootstrap de l'app : le
    // faire ici forcerait l'instanciation de HttpClient/HTTP_INTERCEPTORS
    // pendant la construction d'AuthService, or ces intercepteurs dependent
    // d'AuthService -> dependance circulaire DI (NG0200).
    this.loadUserFromStoredToken();
  }

  // ─── Login ───────────────────────────────────────────────────────────────────

  /**
   * Première étape de la connexion.
   *
   * Deux issues, toutes deux en HTTP 200 : soit la session est ouverte, soit un
   * code de vérification est attendu. On ne se fie qu'au champ `code` pour les
   * distinguer, et la session n'est ouverte que dans le premier cas — sans quoi
   * un compte protégé par un second facteur serait accessible sans celui-ci.
   *
   * La navigation reste ici pour LOGIN_SUCCESS, comme avant ; le cas OTP est
   * conduit par le composant, qui a la route de vérification à sa charge.
   */
  login(credentials: LoginRequest): Observable<LoginApiResponse> {
    return this.http
      .post<LoginApiResponse>(`${this.apiUrl}/auth/login`, credentials)
      .pipe(
        tap((response) => {
          if (response.code === 'LOGIN_SUCCESS') {
            this.ouvrirSession(response.data);
            this.navigateByRole(response.data.must_change_password);
          }
        })
      );
  }

  // ─── Vérification du code ────────────────────────────────────────────────────

  /**
   * Seconde étape : le code reçu par e-mail contre les jetons.
   *
   * C'est ici seulement que la session naît lorsqu'un code était exigé.
   */
  verifyOtp(challengeToken: string, otp: string): Observable<VerifyOtpResponse> {
    return this.http
      .post<VerifyOtpResponse>(`${this.apiUrl}/auth/verify-otp`, {
        challenge_token: challengeToken,
        otp
      })
      .pipe(
        tap((response) => {
          this.ouvrirSession(response.data);
          this.navigateByRole(response.data.must_change_password);
        })
      );
  }

  resendOtp(challengeToken: string): Observable<ResendOtpResponse> {
    return this.http.post<ResendOtpResponse>(`${this.apiUrl}/auth/resend-otp`, {
      challenge_token: challengeToken
    });
  }

  // ─── Double authentification ─────────────────────────────────────────────────

  /** Active ou coupe le second facteur du compte connecté. */
  toggleTwoFactor(
    enabled: boolean,
    password: string
  ): Observable<TwoFactorResponse> {
    return this.http.post<TwoFactorResponse>(`${this.apiUrl}/auth/two-factor`, {
      enabled,
      password
    });
  }

  // ─── Refresh token ───────────────────────────────────────────────────────────

  refresh(): Observable<RefreshApiResponse> {
    const refreshToken = this.getRefreshToken();
    const headers = new HttpHeaders({
      Authorization: `Bearer ${refreshToken}`
    });
    return this.http
      .post<RefreshApiResponse>(`${this.apiUrl}/auth/refresh`, {}, { headers })
      .pipe(
        tap((response) => {
          this.storeTokens(
            response.data.access_token,
            response.data.refresh_token
          );
          this.loadUserFromToken(response.data.access_token);
        })
      );
  }

  // ─── Logout ──────────────────────────────────────────────────────────────────

  logout(): void {
    const refreshToken = this.getRefreshToken();
    this.clearSession();
    if (refreshToken) {
      this.http.post<LogoutResponse>(`${this.apiUrl}/auth/logout`, {}).subscribe({
        error: () => {}
      });
    }
  }

  // ─── Mot de passe oublié ─────────────────────────────────────────────────────

  /**
   * Demande un lien de réinitialisation.
   *
   * La réponse est identique que l'adresse existe ou non — le serveur ne dit
   * jamais qui possède un compte. L'écran doit donc afficher le même message
   * dans tous les cas.
   */
  forgotPassword(email: string): Observable<PasswordResetResponse> {
    return this.http.post<PasswordResetResponse>(
      `${this.apiUrl}/auth/forgot-password`,
      { email }
    );
  }

  resetPassword(data: {
    token: string;
    email: string;
    password: string;
    password_confirmation: string;
  }): Observable<PasswordResetResponse> {
    return this.http.post<PasswordResetResponse>(
      `${this.apiUrl}/auth/reset-password`,
      data
    );
  }

  /**
   * Change un mot de passe encore provisoire (première connexion).
   *
   * Le serveur n'attend que le nouveau mot de passe et sa confirmation :
   * l'utilisateur est identifié par son jeton, et l'ancien mot de passe n'est
   * pas redemandé — il vient d'être saisi pour ouvrir cette session, et pour
   * un tuteur il a été transmis par l'école, pas choisi par lui.
   *
   * Les noms de champs sont ceux de `ChangePasswordRequest` : l'écran
   * envoyait auparavant `new_password`/`current_password`, que l'API ignorait,
   * et l'appel repartait systématiquement en 422.
   */
  changePasswordFirstLogin(data: {
    password: string;
    password_confirmation: string;
  }): Observable<ResponseMessage> {
    return this.http.post<ResponseMessage>(
      `${this.apiUrl}/auth/change-password`,
      data
    );
  }

  // ─── Accesseurs tokens ───────────────────────────────────────────────────────

  getAccessToken(): string | null {
    return localStorage.getItem(this.ACCESS_TOKEN_KEY);
  }

  getRefreshToken(): string | null {
    return localStorage.getItem(this.REFRESH_TOKEN_KEY);
  }

  // ─── État auth ───────────────────────────────────────────────────────────────

  isLoggedIn(): boolean {
    const token = this.getAccessToken();
    return !!token && !this.isTokenExpired(token);
  }

  getCurrentUserSync(): UserFromToken | null {
    return this.userSubject.getValue();
  }

  /** Role de l'utilisateur courant, normalise en minuscules ('' si inconnu). */
  getRole(): string {
    return this.getCurrentUserSync()?.role?.toLowerCase() ?? '';
  }

  /**
   * Vrai si l'utilisateur courant est un surveillant. Utilise par les ecrans
   * mutualises manager/surveillant pour masquer les actions reservees
   * (creation/suppression de classes, suppression d'eleves...).
   */
  isSupervisor(): boolean {
    return this.getRole() === 'supervisor';
  }

  /**
   * Droit d'encaisser. `acces_caisse` ne concerne que le tresorier :
   * l'administrateur, qui n'a pas de profil tresorier, supervise l'ensemble et
   * n'est pas soumis au drapeau.
   *
   * Le serveur applique la meme regle sur les routes d'encaissement : ceci ne
   * fait qu'eviter au tresorier de decouvrir le refus apres coup.
   */
  hasAccesCaisse(): boolean {
    const user = this.getCurrentUserSync();
    const role = user?.role?.toLowerCase() ?? '';

    if (role !== 'treasurer') {
      return role === 'admin';
    }

    // Le drapeau est NOT NULL DEFAULT true côté serveur : seul un false
    // explicite retire le droit. Un profil absent du jeton ne doit pas fermer
    // la caisse par accident.
    return user?.profil?.acces_caisse !== false;
  }

  /**
   * Vrai si l'utilisateur courant est administrateur. Utilise pour masquer les
   * actions que le serveur reserve a l'admin seul (suppression d'une annee
   * scolaire...), afin de ne pas proposer un bouton qui repondrait 403.
   */
  isAdmin(): boolean {
    return this.getRole() === 'admin';
  }

  getMe(): Observable<UserFromToken> {
    return this.http
      .get<MeApiResponse>(`${this.apiUrl}/auth/me`)
      .pipe(
        map((res) => res.payload),
        tap((user) => this.appliquerUtilisateur(user))
      );
  }

  /**
   * Installe l'utilisateur reçu du serveur comme état courant.
   *
   * Point de passage unique pour `me` et pour la mise à jour du profil : tout
   * écran abonné à `user$` voit le même objet au même instant.
   */
  private appliquerUtilisateur(user: UserFromToken): void {
    // On rafraichit le cache des menus depuis le serveur : toute
    // modification cote backend (ajout, icone, url) est prise en compte
    // sans imposer une reconnexion.
    if (user.menus?.length) {
      localStorage.setItem(this.MENUS_KEY, JSON.stringify(user.menus));
    }
    this.userSubject.next(user);
  }

  /**
   * Enregistre les coordonnées et la photo du compte connecté.
   *
   * Le corps part en `multipart/form-data` : la photo est un fichier, et une
   * requête JSON ne saurait pas la porter. On laisse le navigateur poser
   * lui-même l'en-tête `Content-Type` — le fixer à la main omettrait la
   * `boundary`, et le serveur recevrait un corps qu'il ne sait pas découper.
   *
   * La réponse porte le profil complet : on la pousse directement dans
   * `userSubject`, si bien que la barre latérale, l'en-tête et la fiche se
   * mettent à jour ensemble, sans second appel à `me`.
   */
  updateProfil(donnees: UpdateProfilRequest): Observable<UserFromToken> {
    const corps = new FormData();
    corps.append('first_name', donnees.first_name);
    corps.append('last_name', donnees.last_name);
    corps.append('phone_number_one', donnees.phone_number_one);
    // Un champ vidé doit effacer la valeur au serveur : on envoie la chaîne
    // vide plutôt que d'omettre la clé, qui signifierait « ne touche à rien ».
    corps.append('phone_number_two', donnees.phone_number_two ?? '');
    corps.append('address', donnees.address ?? '');

    if (donnees.photo) {
      corps.append('photo', donnees.photo, donnees.photo.name);
    } else if (donnees.supprimer_photo) {
      corps.append('supprimer_photo', '1');
    }

    return this.http
      .post<MeApiResponse>(`${this.apiUrl}/auth/profil`, corps)
      .pipe(
        map((res) => res.payload),
        tap((user) => this.appliquerUtilisateur(user))
      );
  }

  /**
   * Rafraichit silencieusement l'utilisateur et ses menus au demarrage de
   * l'app (si une session valide existe). Ne remonte pas d'erreur : en cas
   * d'echec, on garde le cache local en place.
   */
  refreshCurrentUser(): void {
    if (!this.isLoggedIn()) return;
    this.getMe().subscribe({ error: () => {} });
  }

  // ─── Helpers privés ──────────────────────────────────────────────────────────

  /** Installe la session à partir des jetons reçus. Point d'entrée unique. */
  private ouvrirSession(data: SessionData): void {
    this.storeTokens(data.access_token, data.refresh_token, data.menus);
    this.loadUserFromToken(data.access_token, data.menus);
  }

  private storeTokens(
    access: string,
    refresh: string,
    menus?: UserFromToken['menus']
  ): void {
    localStorage.setItem(this.ACCESS_TOKEN_KEY, access);
    localStorage.setItem(this.REFRESH_TOKEN_KEY, refresh);
    if (menus) {
      localStorage.setItem(this.MENUS_KEY, JSON.stringify(menus));
    }
  }

  private clearSession(): void {
    localStorage.removeItem(this.ACCESS_TOKEN_KEY);
    localStorage.removeItem(this.REFRESH_TOKEN_KEY);
    localStorage.removeItem(this.MENUS_KEY);
    this.userSubject.next(null);
    this.router.navigate(['/login']);
  }

  private loadUserFromStoredToken(): void {
    const token = this.getAccessToken();
    if (token && !this.isTokenExpired(token)) {
      const stored = localStorage.getItem(this.MENUS_KEY);
      const menus = stored ? JSON.parse(stored) : undefined;
      this.loadUserFromToken(token, menus);
    }
  }

  private loadUserFromToken(
    token: string,
    menus?: UserFromToken['menus']
  ): void {
    try {
      const payload = this.decodeJwt(token);
      if (payload.token_type === 'access') {
        const user = menus?.length ? { ...payload.user, menus } : payload.user;
        this.userSubject.next(user);
      }
    } catch {
      this.userSubject.next(null);
    }
  }

  decodeJwt(token: string): JwtPayload {
    const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(atob(base64));
  }

  isTokenExpired(token: string): boolean {
    try {
      const payload = this.decodeJwt(token);
      return payload.exp < Date.now() / 1000;
    } catch {
      return true;
    }
  }

  /**
   * Oriente l'utilisateur après une connexion réussie.
   *
   * Un mot de passe encore provisoire passe avant tout le reste : celui d'un
   * tuteur a transité par un tiers (l'agent qui a ouvert l'accès, puis un SMS
   * ou une remise en main propre), celui du personnel est un mot de passe
   * commun. Tant qu'il n'a pas été changé, l'application n'ouvre rien d'autre
   * que l'écran de changement.
   *
   * Le drapeau est lu sur la réponse de connexion et non dans le jeton : le
   * JWT ne le porte pas.
   */
  /**
   * Conduit l'utilisateur vers son espace, d'après ses menus.
   *
   * Exposée pour l'écran de changement de mot de passe : une fois le mot de
   * passe choisi, la session est intacte et il n'y a aucune raison de repasser
   * par la connexion.
   */
  allerVersSonEspace(): void {
    this.navigateByRole();
  }

  private navigateByRole(motDePasseAChanger = false): void {
    if (motDePasseAChanger) {
      this.router.navigate(['/change-password']);
      return;
    }

    const user = this.userSubject.getValue();
    if (!user || !user.menus?.length) return;

    const defaultMenu = user.menus.find((m: any) => m.is_default);

    if (defaultMenu?.url) {
      this.router.navigate([defaultMenu.url]);
      return;
    }
    this.router.navigate([user.menus[0].url]);
  }
}
