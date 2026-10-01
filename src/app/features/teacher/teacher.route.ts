import { VexRoutes } from '@vex/interfaces/vex-route.interface';

/**
 * Espace enseignant. La gestion des évaluations par période : liste des
 * évaluations de l'enseignant, création, et saisie des notes de chaque élève.
 * Manager/admin y accèdent aussi (vue globale côté backend).
 */
export const teacherRoute: VexRoutes = [
  {
    path: 'home',
    loadComponent: () =>
      import('./home-teacher/home-teacher.component').then(
        (c) => c.HomeTeacherComponent
      )
  },
  {
    path: 'evaluations',
    loadComponent: () =>
      import('./evaluation/evaluation-list/evaluation-list.component').then(
        (c) => c.EvaluationListComponent
      )
  },
  // La grille de saisie transite l'évaluation par le state du Router (pas
  // d'id dans l'URL), comme les autres écrans de cette app. Route statique.
  {
    path: 'evaluations/notes',
    loadComponent: () =>
      import('./evaluation/evaluation-notes/evaluation-notes.component').then(
        (c) => c.EvaluationNotesComponent
      )
  },

  // Assiduité : la journée de l'enseignant, puis la feuille d'appel. Le
  // créneau et la date passent par le state, d'où la route statique.
  {
    path: 'attendance',
    loadComponent: () =>
      import('./assiduite/mes-creneaux/mes-creneaux.component').then(
        (c) => c.MesCreneauxComponent
      )
  },
  {
    path: 'attendance/feuille',
    loadComponent: () =>
      import('./assiduite/feuille-appel/feuille-appel.component').then(
        (c) => c.FeuilleAppelComponent
      )
  }
];
export default teacherRoute;
