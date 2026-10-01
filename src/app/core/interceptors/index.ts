import { HTTP_INTERCEPTORS } from '@angular/common/http';
import { IpBlockInterceptor } from './ip-block.interceptor';
import { JwtInterceptor } from './jwt.interceptor';
import { ServerErrorInterceptor } from './server-error.interceptor';

export const httpInterceptorProviders = [
  // Déclaré avant le JWT : un 429 pour IP bloquée doit être reconnu comme tel
  // avant que la couche d'authentification ne le confonde avec autre chose.
  { provide: HTTP_INTERCEPTORS, useClass: IpBlockInterceptor, multi: true },
  { provide: HTTP_INTERCEPTORS, useClass: JwtInterceptor, multi: true },
  { provide: HTTP_INTERCEPTORS, useClass: ServerErrorInterceptor, multi: true }
];
