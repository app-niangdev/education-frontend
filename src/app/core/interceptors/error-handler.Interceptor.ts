import { inject, Injectable } from '@angular/core';
import { HttpInterceptor, HttpRequest, HttpErrorResponse, HttpHandler, HttpEvent } from '@angular/common/http';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Router } from '@angular/router';
import { AuthService } from 'src/app/auth/services/auth.service';


@Injectable()
export class ErrorHandlerInterceptor implements HttpInterceptor {
  private authService =  inject(AuthService);
  private router =  inject(Router);

  intercept(request: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    return next.handle(request).pipe(
      tap({
        error: (err: HttpErrorResponse) => {
          if (err.status === 429 || err.status === 500) {
            this.authService.logout();
            // Vérification si la route existe avant de tenter la redirection
            const routeExists = this.router.config.some(route => route.path === 'acces-denied');
            if (routeExists) {
              this.router.navigate(['/acces-denied']);
            }
          }
        },
      })
    );
}
}
