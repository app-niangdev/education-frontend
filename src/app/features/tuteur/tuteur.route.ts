import { VexRoutes } from '@vex/interfaces/vex-route.interface';
import { NotesTuteurComponent } from './notes/notes-tuteur.component';

/**
 * L'espace des familles.
 *
 * La messagerie n'est pas montée ici : elle partage son composant avec les
 * agents et reste déclarée dans app.routes, sous /index/tuteur/messagerie.
 */
const routes: VexRoutes = [
  {
    path: 'notes',
    component: NotesTuteurComponent
  }
];

export default routes;
