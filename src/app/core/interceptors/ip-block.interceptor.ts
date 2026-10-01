import { inject, Injectable } from '@angular/core';
import {
  HttpErrorResponse,
  HttpEvent,
  HttpHandler,
  HttpInterceptor,
  HttpRequest
} from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { IpBlockService } from 'src/app/auth/services/ip-block.service';
import { IpBlockedError } from 'src/app/interfaces/Auth';

/**
 * Capte les refus pour cause d'IP bloquée, d'où qu'ils viennent.
 *
 * Le serveur peut renvoyer ce 429 sur n'importe quelle route, pas seulement le
 * login : un utilisateur en pleine session peut donc le rencontrer si son
 * réseau vient d'être bloqué. L'écouter ici, plutôt que dans le seul écran de
 * connexion, permet d'afficher partout le même décompte.
 *
 * L'erreur est relayée telle quelle : chaque écran reste libre de la traiter.
 */
@Injectable()
export class IpBlockInterceptor implements HttpInterceptor {
  private readonly blocage = inject(IpBlockService);

  intercept(
    req: HttpRequest<unknown>,
    next: HttpHandler
  ): Observable<HttpEvent<unknown>> {
    return next.handle(req).pipe(
      catchError((error) => {
        if (error instanceof HttpErrorResponse && error.status === 429) {
          const corps = error.error as IpBlockedError | null;

          // Le 429 sert aussi aux limiteurs de cadence ; seul le code
          // IP_BLOCKED désigne un blocage progressif avec échéance connue.
          if (corps?.code === 'IP_BLOCKED') {
            this.blocage.declare(corps);
          }
        }

        return throwError(() => error);
      })
    );
  }
}
