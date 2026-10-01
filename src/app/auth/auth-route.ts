import { ActivatedRouteSnapshot, ResolveFn } from '@angular/router';
import { VexRoutes } from '@vex/interfaces/vex-route.interface';
import { AppComponent } from 'src/app/app.component';
// import { ResponseAppSetting } from "../response-type/Type";
import { inject } from '@angular/core';
import { SettingService } from './services/setting.service';
import { maintenanceGuard } from '../core/guards/maintenance.guard';

// export const AppSettingResolver: ResolveFn<ResponseAppSetting> = (route: ActivatedRouteSnapshot) => {
//     return inject(SettingService).getDataApplicationSetting();
// };

const authRoute: VexRoutes = [
  {
    path: '',
    component: AppComponent,
    children: [
      {
        path: '',
        redirectTo: 'home',
        pathMatch: 'full'
      },
      {
        path: 'home',
        canActivate: [maintenanceGuard],
        loadComponent: () =>
          import('../features/home-page/home-page.component').then(
            (m) => m.HomePageComponent
          )
      },

      {
        path: 'login',
        loadComponent: () =>
          import('./login/login.component').then((m) => m.LoginComponent)
      },

      {
        path: 'otp',
        loadComponent: () =>
          import('./otp/otp.component').then((m) => m.OtpComponent)
      },

      {
        path: 'reset-password',
        loadComponent: () =>
          import('./reset-password/reset-password.component').then(
            (m) => m.ResetPasswordComponent
          )
      },

      {
        path: 'forgot-password',
        loadComponent: () =>
          import('./forgot-password/forgot-password.component').then(
            (m) => m.ForgotPasswordComponent
          )
      },
      {
        path: 'email/verify/:id/:hash',
        loadComponent: () =>
          import('./email-verify/email-verify.component').then(
            (m) => m.EmailVerifyComponent
          )
      },
      {
        path: 'change-password',
        loadComponent: () =>
          import('./change-password/change-password.component').then(
            (m) => m.ChangePasswordComponent
          )
      }
    ]
  }
];

export default authRoute;
