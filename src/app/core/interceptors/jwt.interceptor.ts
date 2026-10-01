import { inject, Injectable } from '@angular/core';
import {
  HttpErrorResponse,
  HttpEvent,
  HttpHandler,
  HttpInterceptor,
  HttpRequest
} from '@angular/common/http';
import { BehaviorSubject, Observable, Subject, throwError } from 'rxjs';
import { catchError, filter, switchMap, take, takeUntil } from 'rxjs/operators';
import { AuthService } from 'src/app/auth/services/auth.service';
import { environment } from 'src/environments/environment';

/**
 * Les points d'entrée qui n'attendent pas de jeton.
 *
 * La vérification du code en fait partie : elle sert précisément à obtenir une
 * session. Y joindre un jeton périmé traînant en mémoire déclencherait un
 * refresh, puis une déconnexion, au beau milieu d'une connexion en cours.
 */
const AUTH_ENDPOINTS = [
  `${environment.apiUrl}/auth/login`,
  `${environment.apiUrl}/auth/refresh`,
  `${environment.apiUrl}/auth/logout`,
  `${environment.apiUrl}/auth/verify-otp`,
  `${environment.apiUrl}/auth/resend-otp`
];

/**
 * Les routes publiques, ouvertes à un visiteur sans compte.
 *
 * La vérification d'un contrat en fait partie : elle est atteinte depuis le QR
 * code d'un document papier, par quelqu'un qui n'a rien à voir avec
 * l'établissement. Y joindre un jeton expiré déclencherait un refresh, puis une
 * déconnexion — sur une page qui n'a jamais demandé à être authentifiée.
 */
const PUBLIC_ENDPOINTS = [`${environment.apiUrl}/verification-contrat/`];

@Injectable()
export class JwtInterceptor implements HttpInterceptor {
  private authService = inject(AuthService);

  private isRefreshing = false;
  private refreshTokenSubject = new BehaviorSubject<string | null>(null);
  private refreshFailed = new Subject<void>();

  intercept(req: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    // Ne pas injecter de token sur login/refresh
    if (AUTH_ENDPOINTS.some((url) => req.url === url)) {
      return next.handle(req);
    }

    // Ni sur les routes publiques, qui doivent répondre à un visiteur anonyme.
    if (PUBLIC_ENDPOINTS.some((url) => req.url.startsWith(url))) {
      return next.handle(req);
    }

    const token = this.authService.getAccessToken();
    const authReq = token ? this.addToken(req, token) : req;

    return next.handle(authReq).pipe(
      catchError((error) => {
        if (error instanceof HttpErrorResponse && error.status === 401) {
          return this.handle401(authReq, next);
        }
        return throwError(() => error);
      })
    );
  }

  private addToken(req: HttpRequest<unknown>, token: string): HttpRequest<unknown> {
    return req.clone({
      setHeaders: { Authorization: `Bearer ${token}` }
    });
  }

  private handle401(
    req: HttpRequest<unknown>,
    next: HttpHandler
  ): Observable<HttpEvent<unknown>> {
    if (!this.isRefreshing) {
      this.isRefreshing = true;
      this.refreshTokenSubject.next(null);

      return this.authService.refresh().pipe(
        switchMap((response) => {
          this.isRefreshing = false;
          const newToken = response.data.access_token;
          this.refreshTokenSubject.next(newToken);
          return next.handle(this.addToken(req, newToken));
        }),
        catchError((err) => {
          this.isRefreshing = false;
          this.authService.logout();
          this.refreshFailed.next();
          return throwError(() => err);
        })
      );
    }

    // File d'attente : les requêtes simultanées attendent le nouveau token.
    // Si le refresh échoue, refreshFailed les libère pour qu'elles échouent
    // elles aussi au lieu de rester bloquées indéfiniment.
    return this.refreshTokenSubject.pipe(
      filter((token): token is string => token !== null),
      take(1),
      takeUntil(this.refreshFailed),
      switchMap((token) => next.handle(this.addToken(req, token)))
    );
  }
}
