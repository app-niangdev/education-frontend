import { VexRoutes } from '@vex/interfaces/vex-route.interface';

/**
 * Espace tresorier. Deux blocs : la consultation (eleves, inscriptions) puis
 * l'encaissement, qui s'appuie sur les endpoints finance-tresorier.
 *
 * Les ecrans eleves/inscriptions sont mutualises avec l'espace manager : on
 * reutilise directement ces composants, la navigation interne restant dans
 * /index/treasurer/... grace a la resolution d'aire (voir
 * core/navigation/aire-courante).
 */
export const treasurerRoute: VexRoutes = [
  {
    path: 'home',
    loadComponent: () =>
      import('./home-treasurer/home-treasurer.component').then(
        (c) => c.HomeTreasurerComponent
      )
  },

  // ─── Eleves et inscriptions : consultation seule ───────────────────────────
  // Le tresorier ne cree ni ne modifie une fiche, et n'inscrit pas (il valide
  // l'inscription en l'encaissant, voir `encaissements`) : les
  // routes de saisie (students/add, students/edit, inscriptions/add)
  // n'existent pas dans son espace. Le serveur applique la meme regle.
  {
    path: 'students',
    loadComponent: () =>
      import('../manager/eleve/eleve-list/eleve-list.component').then(
        (c) => c.EleveListComponent
      )
  },
  {
    path: 'students/detail',
    loadComponent: () =>
      import('../manager/eleve/eleve-detail/eleve-detail.component').then(
        (c) => c.EleveDetailComponent
      )
  },
  {
    path: 'inscriptions',
    loadComponent: () =>
      import(
        '../manager/inscription/inscription-list/inscription-list.component'
      ).then((c) => c.InscriptionListComponent)
  },

  {
    path: 'encaissements',
    loadComponent: () =>
      import('./encaissements/encaissements.component').then(
        (c) => c.EncaissementsComponent
      )
  },
  {
    path: 'mensualites',
    loadComponent: () =>
      import('./mensualites/mensualites.component').then(
        (c) => c.MensualitesComponent
      )
  },
  {
    path: 'paiements',
    loadComponent: () =>
      import('./paiements/paiements.component').then(
        (c) => c.PaiementsComponent
      )
  },
  {
    // Module partagé avec le manager : même composant, accès trésorier.
    path: 'expenses',
    loadComponent: () =>
      import('../shared/depense/depense-list/depense-list.component').then(
        (c) => c.DepenseListComponent
      )
  },
  {
    // Bilan financier : partagé avec le manager, comme les dépenses.
    path: 'bilan',
    loadComponent: () =>
      import('../shared/bilan/bilan.component').then((c) => c.BilanComponent)
  }
];
export default treasurerRoute;
