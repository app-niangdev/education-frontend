import { VexRoutes } from '@vex/interfaces/vex-route.interface';
import { ConversationFilComponent } from './conversation-fil/conversation-fil.component';
import { MessagerieVideComponent } from './messagerie-vide/messagerie-vide.component';
import { MessagerieComponent } from './messagerie.component';

/**
 * Les routes de la messagerie, montées deux fois : sous /index/messagerie pour
 * les agents, sous /index/tuteur/messagerie pour les familles. Le composant est
 * le même — ce que chacun voit est décidé côté serveur, pas par l'URL.
 *
 * `scrollDisabled` et `footerVisible: false` : le fil gère son propre
 * défilement, un second niveau de scroll rendrait la zone de saisie fuyante.
 */
const routes: VexRoutes = [
  {
    path: '',
    component: MessagerieComponent,
    data: {
      scrollDisabled: true,
      toolbarShadowEnabled: false,
      footerVisible: false
    },
    children: [
      {
        path: '',
        pathMatch: 'full',
        component: MessagerieVideComponent
      },
      {
        path: ':id',
        component: ConversationFilComponent
      }
    ]
  }
];

export default routes;
