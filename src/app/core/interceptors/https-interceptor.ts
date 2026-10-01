// Dans un intercepteur HTTP (app.module.ts ou un service dédié)
import { Injectable } from '@angular/core';
import { HttpInterceptor, HttpRequest, HttpHandler, HttpEvent } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable()
export class HttpsInterceptor implements HttpInterceptor {
  intercept(request: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    // Remplacer toutes les requêtes HTTP par HTTPS
    if (request.url.startsWith('http://')) {
      const secureUrl = request.url.replace('http://', 'https://');
      request = request.clone({
        url: secureUrl
      });
    }
    return next.handle(request);
  }
}
