import { VexRoutes } from '@vex/interfaces/vex-route.interface';

export const adminRoute: VexRoutes = [
  {
    // Le parametrage a rejoint la page Etablissement : un seul ecran porte
    // desormais l'identite, les contacts et les reglages de l'application.
    // La redirection garde valides les liens deja en circulation.
    path: 'settings',
    redirectTo: '/index/manager/school-infos',
    pathMatch: 'full'
  }
];
export default adminRoute;
