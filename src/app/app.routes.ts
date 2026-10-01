import { VexRoutes } from '@vex/interfaces/vex-route.interface';
import { authGuard } from './core/guards/auth.guard';
import { afterLoginGuard } from './core/guards/after-login.guard';
import { ManagerGuard } from './core/guards/manager.guard';
import { AdminGuard } from './core/guards/admin.guard';
import { TreasurerGuard } from './core/guards/treasurer.guard';
import { TeacherGuard } from './core/guards/teacher.guard';
import { SupervisorGuard } from './core/guards/supervisor.guard';
import { MessagerieGuard } from './core/guards/messagerie.guard';
import { TuteurGuard } from './core/guards/tuteur.guard';
import { maintenanceGuard } from './core/guards/maintenance.guard';

export const appRoutes: VexRoutes = [
  // Cible du QR code imprimé sur les contrats du personnel. Publique et hors
  // du layout authentifié : celui qui scanne le papier n'a pas de compte ici.
  //
  // Déclarée avant la route '' : celle-ci porte afterLoginGuard, qui renvoie
  // vers /index dès qu'une session existe. Un manager scannant un contrat
  // n'atterrirait jamais sur la vérification.
  {
    path: 'verification-contrat/:code',
    loadComponent: () =>
      import(
        './features/verification-contrat/verification-contrat.component'
      ).then((m) => m.VerificationContratComponent)
  },
  {
    path: '',
    loadChildren: () => import('./auth/auth-route'),
    canActivate: [afterLoginGuard]
  },
  {
    path: 'unauthorized',
    loadComponent: () =>
      import('./features/unauthorized/unauthorized.component').then(
        (m) => m.UnauthorizedComponent
      )
  },
  {
    // Page de maintenance : accessible sans garde (l'admin y trouve le lien
    // de connexion pour désactiver la maintenance).
    path: 'maintenance',
    loadComponent: () =>
      import('./features/maintenance/maintenance.component').then(
        (m) => m.MaintenanceComponent
      )
  },
  {
    path: 'index',
    loadComponent: () =>
      import('./layouts/layout/layout.component').then(
        (m) => m.LayoutComponent
      ),
    canActivate: [authGuard, maintenanceGuard],
    children: [
      {
        path: 'admin',
        loadChildren: () => import('./features/admin/admin.route'),
        canActivate: [AdminGuard]
      },
      {
        path: 'manager',
        loadChildren: () => import('./features/manager/manager.route'),
        canActivate: [ManagerGuard]
      },
      {
        path: 'treasurer',
        loadChildren: () => import('./features/treasurer/treasurer.route'),
        canActivate: [TreasurerGuard]
      },
      {
        path: 'teacher',
        loadChildren: () => import('./features/teacher/teacher.route'),
        canActivate: [TeacherGuard]
      },
      {
        path: 'supervisor',
        loadChildren: () => import('./features/supervisor/supervisor.route'),
        canActivate: [SupervisorGuard]
      },
      // La corbeille des services. Même composant que l'espace tuteur
      // ci-dessous : c'est le serveur qui décide de ce que chacun voit.
      {
        path: 'messagerie',
        loadChildren: () =>
          import('./features/shared/messagerie/messagerie.route'),
        canActivate: [MessagerieGuard]
      },
      // L'espace des familles. Séparé du précédent parce que le tuteur n'a
      // accès à rien d'autre : il n'a ni tableau de bord ni module de gestion.
      //
      // Déclarée avant `tuteur` : sans quoi ce dernier, qui traite tout ce qui
      // suit `tuteur/`, capterait aussi `messagerie` et le fil de discussion
      // ne s'ouvrirait plus.
      {
        path: 'tuteur/messagerie',
        loadChildren: () =>
          import('./features/shared/messagerie/messagerie.route'),
        canActivate: [TuteurGuard]
      },
      // Les résultats scolaires des enfants du tuteur connecté.
      {
        path: 'tuteur',
        loadChildren: () => import('./features/tuteur/tuteur.route'),
        canActivate: [TuteurGuard]
      },
      {
        path: 'profile',
        loadChildren: () =>
          import('./layouts/components/profile/profile.routes')
      }
    ]
  },
  // Filet de sécurité global : toute URL inconnue (lien obsolète, favori,
  // faute de frappe) redirige vers l'accueil au lieu de planter avec NG04002
  // (Cannot match any routes). `afterLoginGuard` sur la route '' oriente
  // ensuite vers /index ou /login selon la session.
  {
    path: '**',
    redirectTo: ''
  }
];
