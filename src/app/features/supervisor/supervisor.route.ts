import { VexRoutes } from '@vex/interfaces/vex-route.interface';

/**
 * Espace surveillant. Les ecrans metier (classes, eleves, inscriptions, emploi
 * du temps, mati eres, frais, niveaux, enseignants) sont mutualises avec
 * l'espace manager : on reutilise directement ces composants. La navigation
 * interne reste dans /index/supervisor/... grace a la resolution d'aire
 * (voir core/navigation/aire-courante).
 *
 * Perimetre volontairement restreint : aucun ecran financier / d'encaissement.
 * Le surveillant peut CREER une inscription mais jamais l'encaisser.
 */
export const supervisorRoute: VexRoutes = [
  {
    path: 'home',
    loadComponent: () =>
      import('./home-supervisor/home-supervisor.component').then(
        (c) => c.HomeSupervisorComponent
      )
  },

  // ─── Inscriptions : creation + liste (pas d'encaissement) ──────────────────
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

  // ─── Eleves : consultation + creation / modification ───────────────────────
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

  // ─── Classes : liste, eleves d'une classe, export PDF/Excel, emploi du temps ─
  {
    path: 'classrooms',
    loadComponent: () =>
      import(
        '../manager/classroom/classroom-list/classroom-list.component'
      ).then((c) => c.ClassroomListComponent)
  },
  {
    path: 'classrooms/programme',
    loadComponent: () =>
      import('../manager/classe-programme/classe-programme.component').then(
        (c) => c.ClasseProgrammeComponent
      )
  },
  {
    path: 'classrooms/emploi-du-temps',
    loadComponent: () =>
      import('../manager/emploi-du-temps/emploi-du-temps.component').then(
        (c) => c.EmploiDuTempsComponent
      )
  },

  // ─── Assiduité : le cœur du métier du surveillant ───────────────────────────
  // Il justifie, corrige et suit les récidivistes ; l'appel lui-même est fait
  // par les enseignants depuis leur espace.
  {
    path: 'attendance',
    loadComponent: () =>
      import(
        '../manager/assiduite/assiduite-list/assiduite-list.component'
      ).then((c) => c.AssiduiteListComponent)
  },
  {
    path: 'attendance/eleve',
    loadComponent: () =>
      import(
        '../manager/assiduite/fiche-eleve-absences/fiche-eleve-absences.component'
      ).then((c) => c.FicheEleveAbsencesComponent)
  },

  // ─── Bulletins : consultation et impression uniquement ─────────────────────
  // La generation et la publication restent au manager et a l'admin : les
  // boutons correspondants sont masques et l'API repond 403 au surveillant.
  {
    path: 'report-cards',
    loadComponent: () =>
      import('../manager/bulletin/bulletin-list/bulletin-list.component').then(
        (c) => c.BulletinListComponent
      )
  },
  {
    path: 'report-cards/detail',
    loadComponent: () =>
      import(
        '../manager/bulletin/bulletin-detail/bulletin-detail.component'
      ).then((c) => c.BulletinDetailComponent)
  },

  // ─── Lecture seule ─────────────────────────────────────────────────────────
  {
    path: 'levels',
    loadComponent: () =>
      import('../manager/niveaux/niveaux-list/niveaux-list.component').then(
        (c) => c.NiveauxListComponent
      )
  },
  {
    path: 'subjects',
    loadComponent: () =>
      import('../manager/matiere/matiere-list/matiere-list.component').then(
        (c) => c.MatiereListComponent
      )
  },
  {
    // Fusionne avec `levels` : le tarif se saisit avec le niveau.
    path: 'school-fees',
    redirectTo: 'levels',
    pathMatch: 'full'
  },
  {
    path: 'teachers',
    loadComponent: () =>
      import(
        '../manager/enseignant/enseignant-list/enseignant-list.component'
      ).then((c) => c.EnseignantListComponent)
  },
  {
    path: 'school-year',
    loadComponent: () =>
      import(
        '../manager/school-year/school-year-list/school-year-list.component'
      ).then((c) => c.SchoolYearListComponent)
  },

  { path: '', redirectTo: 'home', pathMatch: 'full' }
];

export default supervisorRoute;
