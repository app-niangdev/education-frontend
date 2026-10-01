import { VexRoutes } from '@vex/interfaces/vex-route.interface';

/**
 * Espace tresorier. Deux blocs : la saisie (eleves, inscriptions) puis
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

  // ─── Eleves : consultation, creation, modification ─────────────────────────
  // La creation enchaine sur l'inscription : c'est ce qui evite qu'un eleve
  // soit saisi puis oublie sans inscription (voir EleveAddUpdateComponent).
  {
    path: 'students',
    loadComponent: () =>
      import('../manager/eleve/eleve-list/eleve-list.component').then(
        (c) => c.EleveListComponent
      )
  },
  {
    path: 'students/add',
    loadComponent: () =>
      import(
        '../manager/eleve/eleve-add-update/eleve-add-update.component'
      ).then((c) => c.EleveAddUpdateComponent)
  },
  {
    path: 'students/edit',
    loadComponent: () =>
      import(
        '../manager/eleve/eleve-add-update/eleve-add-update.component'
      ).then((c) => c.EleveAddUpdateComponent)
  },
  {
    path: 'students/detail',
    loadComponent: () =>
      import('../manager/eleve/eleve-detail/eleve-detail.component').then(
        (c) => c.EleveDetailComponent
      )
  },

  // ─── Inscriptions : saisie et liste ────────────────────────────────────────
  // L'inscription ouvre les frais et l'echeancier : c'est un acte de caisse,
  // le tresorier la saisit donc lui-meme, au guichet.
  {
    path: 'inscriptions',
    loadComponent: () =>
      import(
        '../manager/inscription/inscription-list/inscription-list.component'
      ).then((c) => c.InscriptionListComponent)
  },
  {
    path: 'inscriptions/add',
    loadComponent: () =>
      import(
        '../manager/inscription/inscription-add/inscription-add.component'
      ).then((c) => c.InscriptionAddComponent)
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
