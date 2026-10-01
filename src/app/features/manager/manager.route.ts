import { VexRoutes } from '@vex/interfaces/vex-route.interface';

export const managerRoute: VexRoutes = [
  {
    path: 'home',
    loadComponent: () =>
      import('../manager/home-manager/home-manager.component').then(
        (c) => c.HomeManagerComponent
      )
  },
  {
    // Niveaux et frais scolaires sont un seul ecran : le tarif se saisit avec
    // le niveau. L'ancienne route `school-fees` y redirige.
    path: 'levels',
    loadComponent: () =>
      import('../manager/niveaux/niveaux-list/niveaux-list.component').then(
        (c) => c.NiveauxListComponent
      )
  },
  {
    path: 'school-fees',
    redirectTo: 'levels',
    pathMatch: 'full'
  },
  {
    path: 'periods',
    loadComponent: () =>
      import('./periode/periode-list/periode-list.component').then(
        (c) => c.PeriodeListComponent
      )
  },
  {
    path: 'classrooms',
    loadComponent: () =>
      import('./classroom/classroom-list/classroom-list.component').then(
        (c) => c.ClassroomListComponent
      )
  },
  // La classe transite par le state du Router (pas d'id dans l'URL). Ces
  // routes sont donc statiques ; un rafraichissement conserve le state.
  {
    path: 'classrooms/programme',
    loadComponent: () =>
      import('./classe-programme/classe-programme.component').then(
        (c) => c.ClasseProgrammeComponent
      )
  },
  {
    path: 'classrooms/emploi-du-temps',
    loadComponent: () =>
      import('./emploi-du-temps/emploi-du-temps.component').then(
        (c) => c.EmploiDuTempsComponent
      )
  },
  {
    path: 'subjects',
    loadComponent: () =>
      import('./matiere/matiere-list/matiere-list.component').then(
        (c) => c.MatiereListComponent
      )
  },
  {
    path: 'students',
    loadComponent: () =>
      import('./eleve/eleve-list/eleve-list.component').then(
        (c) => c.EleveListComponent
      )
  },
  // L'identifiant de l'eleve circule par le state du Router, pas par l'URL :
  // ces routes sont donc statiques. Rafraichir la page perd le state, chaque
  // composant retombe alors sur la liste.
  {
    path: 'students/add',
    loadComponent: () =>
      import('./eleve/eleve-add-update/eleve-add-update.component').then(
        (c) => c.EleveAddUpdateComponent
      )
  },
  {
    path: 'students/edit',
    loadComponent: () =>
      import('./eleve/eleve-add-update/eleve-add-update.component').then(
        (c) => c.EleveAddUpdateComponent
      )
  },
  {
    path: 'students/detail',
    loadComponent: () =>
      import('./eleve/eleve-detail/eleve-detail.component').then(
        (c) => c.EleveDetailComponent
      )
  },
  // Assiduité : registre des anomalies, puis fiche d'un élève. L'identifiant
  // passe par le state du Router, la route reste donc statique.
  {
    path: 'attendance',
    loadComponent: () =>
      import('./assiduite/assiduite-list/assiduite-list.component').then(
        (c) => c.AssiduiteListComponent
      )
  },
  {
    path: 'attendance/eleve',
    loadComponent: () =>
      import(
        './assiduite/fiche-eleve-absences/fiche-eleve-absences.component'
      ).then((c) => c.FicheEleveAbsencesComponent)
  },
  {
    path: 'report-cards',
    loadComponent: () =>
      import('./bulletin/bulletin-list/bulletin-list.component').then(
        (c) => c.BulletinListComponent
      )
  },
  // Meme principe que pour les eleves : l'identifiant du bulletin passe par le
  // state du Router, la route reste donc statique.
  {
    path: 'report-cards/detail',
    loadComponent: () =>
      import('./bulletin/bulletin-detail/bulletin-detail.component').then(
        (c) => c.BulletinDetailComponent
      )
  },
  {
    // Consultation seule : la saisie d'une inscription est passee au tresorier
    // (acte de caisse, voir treasurer.route). Le manager suit la liste, annule
    // et supprime, mais ne cree plus — l'ancienne route `inscriptions/add` est
    // supprimee, le bouton correspondant masque cote template.
    path: 'inscriptions',
    loadComponent: () =>
      import('./inscription/inscription-list/inscription-list.component').then(
        (c) => c.InscriptionListComponent
      )
  },
  {
    path: 'school-infos',
    loadComponent: () =>
      import('./etablissement/etablissement-show/etablissement.component').then(
        (c) => c.EtablissementComponent
      )
  },
  {
    path: 'school-year',
    loadComponent: () =>
      import('./school-year/school-year-list/school-year-list.component').then(
        (c) => c.SchoolYearListComponent
      )
  },
  {
    path: 'teachers',
    loadComponent: () =>
      import('./enseignant/enseignant-list/enseignant-list.component').then(
        (c) => c.EnseignantListComponent
      )
  },
  {
    path: 'supervisors',
    loadComponent: () =>
      import('./surveillant/surveillant-list/surveillant-list.component').then(
        (c) => c.SurveillantListComponent
      )
  },
  {
    path: 'treasurers',
    loadComponent: () =>
      import('./tresorier/tresorier-list/tresorier-list.component').then(
        (c) => c.TresorierListComponent
      )
  },
  {
    // Contrats de travail du personnel : enseignants, trésoriers, surveillants
    // sont réunis ici, leurs conditions d'engagement étant de même nature.
    path: 'contracts',
    loadComponent: () =>
      import('./contrat/contrat-list/contrat-list.component').then(
        (c) => c.ContratListComponent
      )
  },
  {
    path: 'activity-log',
    loadComponent: () =>
      import('./activity-log/activity-log.component').then(
        (c) => c.ActivityLogComponent
      )
  },
  {
    // Module partagé avec le trésorier : composant unique, deux points d'entrée.
    path: 'expenses',
    loadComponent: () =>
      import('../shared/depense/depense-list/depense-list.component').then(
        (c) => c.DepenseListComponent
      )
  },
  {
    // Bilan financier : partagé avec le trésorier, comme les dépenses.
    path: 'bilan',
    loadComponent: () =>
      import('../shared/bilan/bilan.component').then((c) => c.BilanComponent)
  },
  // Filet de sécurité : toute URL de cet espace qui ne correspond à aucune
  // route ci-dessus (ex. un lien vers l'ancienne route `inscriptions/add`,
  // supprimée côté manager) redirige vers l'accueil au lieu de planter avec
  // NG04002 (Cannot match any routes).
  {
    path: '**',
    redirectTo: 'home'
  }
];
export default managerRoute;
