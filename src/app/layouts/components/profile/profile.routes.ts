import { ProfileComponent } from './profile.component';
import { VexRoutes } from '@vex/interfaces/vex-route.interface';

const routes: VexRoutes = [
  {
    path: '',
    component: ProfileComponent,
    data: {
      toolbarShadowEnabled: true
    },
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./profile-show-update/profile-show-update.component').then(
            (m) => m.ProfileShowUpdateComponent
          )
      },
      {
        path: 'security',
        loadComponent: () =>
          import('./profile-security/profile-security.component').then(
            (m) => m.ProfileSecurityComponent
          )
      }
    ]
  }
];

export default routes;
