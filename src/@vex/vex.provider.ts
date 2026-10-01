import {
  ENVIRONMENT_INITIALIZER,
  EnvironmentProviders,
  inject,
  Provider
} from '@angular/core';
import {
  MAT_FORM_FIELD_DEFAULT_OPTIONS,
  MatFormFieldDefaultOptions
} from '@angular/material/form-field';
import { MATERIAL_SANITY_CHECKS } from '@angular/material/core';
import { VexSplashScreenService } from '@vex/services/vex-splash-screen.service';
import { VexLayoutService } from '@vex/services/vex-layout.service';
import { VexDemoService } from '@vex/services/vex-demo.service';
import { VexPlatformService } from '@vex/services/vex-platform.service';
import { VexConfig, VexThemeProvider } from '@vex/config/vex-config.interface';
import { VEX_CONFIG, VEX_THEMES } from '@vex/config/config.token';
export function provideVex(options: {
  config: VexConfig;
  availableThemes: VexThemeProvider[];
}): (Provider | EnvironmentProviders)[] {
  return [
    {
      provide: VEX_CONFIG,
      useValue: options.config
    },
    {
      provide: VEX_THEMES,
      useValue: options.availableThemes
    },
    {
      provide: MATERIAL_SANITY_CHECKS,
      useValue: {
        doctype: true,
        theme: false,
        version: true
      }
    },
    {
      provide: MAT_FORM_FIELD_DEFAULT_OPTIONS,
      useValue: {
        appearance: 'outline'
      } satisfies MatFormFieldDefaultOptions
    },
    {
      provide: ENVIRONMENT_INITIALIZER,
      useValue: () => inject(VexSplashScreenService),
      multi: true
    },
    {
      provide: ENVIRONMENT_INITIALIZER,
      useValue: () => inject(VexLayoutService),
      multi: true
    },
    {
      provide: ENVIRONMENT_INITIALIZER,
      useValue: () => inject(VexPlatformService),
      multi: true
    },
    {
      provide: ENVIRONMENT_INITIALIZER,
      useValue: () => inject(VexDemoService),
      multi: true
    }
  ];
}
