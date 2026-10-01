import { ApplicationConfig, importProvidersFrom } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { appRoutes } from './app.routes';
import { provideAnimations } from '@angular/platform-browser/animations';
import {
  provideHttpClient,
  withInterceptorsFromDi
} from '@angular/common/http';
import { MAT_DATE_LOCALE, MatNativeDateModule } from '@angular/material/core';
import { provideRouter, withInMemoryScrolling } from '@angular/router';
import { ColorPickerService } from 'ngx-color-picker';
import { ToastrModule } from 'ngx-toastr';
import { provideIcons } from './core/icons/icons.provider';
import { provideLuxon } from './core/luxon/luxon.provider';
import { provideVex } from '@vex/vex.provider';
import { provideNavigation } from './core/navigation/navigation.provider';
import { vexConfigs } from '@vex/config/vex-configs';
import { httpInterceptorProviders } from './core/interceptors';

export const appConfig: ApplicationConfig = {
  providers: [
    importProvidersFrom(
      BrowserModule,
      // DateAdapter doit vivre dans l'injecteur racine : MatDialog ouvre ses
      // composants depuis la racine, un MatNativeDateModule declare dans les
      // `imports` d'un composant standalone reste invisible pour eux.
      MatNativeDateModule,
      ToastrModule.forRoot({
        timeOut: 4000,
        positionClass: 'toast-top-right',
        preventDuplicates: true
      })
    ),
    { provide: MAT_DATE_LOCALE, useValue: 'fr-FR' },
    // Meme raison que MatNativeDateModule ci-dessus : ColorPickerService n'est
    // pas `providedIn: 'root'`, il n'existe que dans les `providers` du
    // ColorPickerModule. Or importer ce NgModule dans un composant standalone
    // n'apporte que sa directive, pas ses providers — et le picker se cree via
    // ApplicationRef, donc hors de l'injecteur du composant hote.
    ColorPickerService,
    provideRouter(
      appRoutes,
      // TODO: Add preloading withPreloading(),
      withInMemoryScrolling({
        anchorScrolling: 'enabled',
        scrollPositionRestoration: 'enabled'
      })
    ),
    provideAnimations(),
    provideHttpClient(withInterceptorsFromDi()),
    httpInterceptorProviders,
    provideVex({
      /**
       * The config that will be used by default.
       * This can be changed at runtime via the config panel or using the VexConfigService.
       */
      config: vexConfigs.poseidon,
      /**
       * Only themes that are available in the config in tailwind.config.ts should be listed here.
       * Any theme not listed here will not be available in the config panel.
       */
      availableThemes: [
        {
          name: 'Default',
          className: 'vex-theme-default'
        }
      ]
    }),
    provideNavigation(),
    provideIcons(),
    provideLuxon()
  ]
};
