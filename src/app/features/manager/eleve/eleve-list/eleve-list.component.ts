import { CommonModule } from '@angular/common';
import { Component, inject, OnInit } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatMenuModule } from '@angular/material/menu';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Router } from '@angular/router';
import { fadeInRight400ms } from '@vex/animations/fade-in-right.animation';
import { scaleIn400ms } from '@vex/animations/scale-in.animation';
import { stagger40ms } from '@vex/animations/stagger.animation';
import { ClasseService } from 'src/app/auth/services/classe.service';
import { EleveService } from 'src/app/auth/services/eleve.service';
import { NotificationService } from 'src/app/auth/services/Notification.service';
import { AuthService } from 'src/app/auth/services/auth.service';
import {
  ConfirmationDialogData,
  ConfirmatiomModalComponent
} from 'src/app/features/confirmatiom-modal/confirmatiom-modal.component';
import { Classe } from 'src/app/interfaces/Classe';
import { Eleve, STATUTS_INSCRIPTION } from 'src/app/interfaces/Eleve';
import { ListeLigneComponent } from 'src/app/shared/liste/liste-ligne.component';
import { ListePageComponent } from 'src/app/shared/liste/liste-page.component';
import { EleveImportDialogComponent } from '../eleve-import/eleve-import-dialog.component';
import {
  peutModifierEleve,
  peutSaisirInscription,
  ROUTE_ELEVE_AJOUT,
  ROUTE_ELEVE_DETAIL,
  ROUTE_ELEVE_EDITION,
  ROUTE_INSCRIPTION_AJOUT,
  STATE_ELEVE_ID
} from '../eleve-navigation';

@Component({
  selector: 'vex-eleve-list',
  templateUrl: './eleve-list.component.html',
  styleUrls: ['./eleve-list.component.scss'],
  animations: [stagger40ms, scaleIn400ms, fadeInRight400ms],
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatIconModule,
    MatButtonModule,
    MatMenuModule,
    MatTooltipModule,
    MatProgressSpinnerModule,
    MatPaginatorModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatDialogModule,
    ListePageComponent,
    ListeLigneComponent
  ]
})
export class EleveListComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly eleveService = inject(EleveService);
  private readonly classeService = inject(ClasseService);
  private readonly notificationService = inject(NotificationService);
  private readonly dialog = inject(MatDialog);
  private readonly router = inject(Router);
  private readonly authService = inject(AuthService);

  /**
   * Ecran mutualise manager/surveillant/tresorier. Le surveillant peut
   * consulter, creer, modifier et inscrire un eleve, mais pas le supprimer.
   */
  readonly isSupervisor = this.authService.isSupervisor();

  /** Le tresorier consulte les fiches sans les creer ni les modifier. */
  readonly peutModifier = peutModifierEleve(this.authService.getRole(), this.router);

  /**
   * L'inscription appartient au manager et au surveillant. Le tresorier la
   * valide en encaissant, mais n'inscrit pas : le bouton lui est masque.
   */
  readonly peutInscrire = peutSaisirInscription(this.authService.getRole(), this.router);

  /**
   * La reprise de donnees engage tout un fichier d'un coup : elle reste entre
   * les mains de l'admin et du manager. Le surveillant et le tresorier creent
   * au guichet, fiche par fiche. Meme regle cote serveur
   * (ImportElevesRequest::authorize) — ceci ne fait qu'eviter d'afficher un
   * bouton qui repartirait en 403.
   */
  readonly peutImporter = ['admin', 'manager'].includes(
    this.authService.getRole()
  );

  readonly eleves = this.eleveService.eleves;
  readonly meta = this.eleveService.meta;
  readonly statuts = STATUTS_INSCRIPTION;

  /**
   * Ce que l'agent SAISIT. A distinguer de `criteresAppliques` : tant qu'il
   * n'a pas clique sur « Rechercher », ces valeurs ne filtrent rien.
   */
  readonly form = this.fb.nonNullable.group({
    search: '',
    matricule: '',
    statut: '',
    classe: '' as string | number,
    sexe: ''
  });

  /**
   * Les criteres reellement appliques a la liste affichee, figes au clic sur
   * « Rechercher ».
   *
   * Cette copie est ce qui separe « saisi » de « applique », et elle n'est pas
   * qu'un confort : la pagination relit les criteres a chaque page. Sans elle,
   * passer a la page 2 embarquerait au passage les filtres tapes mais pas
   * encore valides, et la page 2 ne serait plus la suite de la page 1.
   */
  private criteresAppliques = this.valeursVides();

  classes: Classe[] = [];
  loading = false;

  page = 1;
  perPage = 10;

  ngOnInit(): void {
    this.loadData();

    // Les classes alimentent le filtre : elles ne changent pas pendant la
    // navigation, une seule requete suffit.
    this.classeService.getAll().subscribe({
      next: (classes) => (this.classes = classes)
    });
  }

  /**
   * Applique les criteres saisis : unique point d'entree de la recherche,
   * les champs ne declenchent plus rien en changeant de valeur.
   *
   * Le retour en page 1 est necessaire : une nouvelle recherche n'a pas le
   * meme nombre de pages, et rester en page 4 afficherait le plus souvent une
   * liste vide.
   */
  rechercher(): void {
    this.criteresAppliques = this.form.getRawValue();
    this.page = 1;
    this.loadData();
  }

  loadData(): void {
    this.loading = true;

    const criteres = this.criteresAppliques;

    this.eleveService
      .getList(this.page, this.perPage, criteres.search.trim(), {
        matricule: criteres.matricule.trim() || null,
        statut_inscription: criteres.statut || null,
        // Le select porte '' quand aucune classe n'est choisie, et l'id
        // numerique sinon : on ne transmet un nombre que dans le second cas.
        classe_actuelle_id: criteres.classe === '' ? null : Number(criteres.classe),
        sexe: criteres.sexe || null
      })
      .subscribe({
        next: () => (this.loading = false),
        error: () => {
          this.loading = false;
          this.notificationService.error(
            'Erreur lors du chargement des élèves'
          );
        }
      });
  }

  onPageChange(event: PageEvent): void {
    this.page = event.pageIndex + 1;
    this.perPage = event.pageSize;
    this.loadData();
  }

  /**
   * Vrai lorsqu'un critere filtre la liste AFFICHEE.
   *
   * Se lit sur les criteres appliques et non sur le formulaire : c'est ce qui
   * fait dire « aucun resultat » plutot que « aucun eleve » quand une
   * recherche ne ramene rien.
   */
  get filtreActif(): boolean {
    return Object.values(this.criteresAppliques).some((valeur) => !!valeur);
  }

  /** Vrai des que la saisie s'ecarte de ce qui est applique. */
  get modificationEnAttente(): boolean {
    const saisi = this.form.getRawValue();

    return (Object.keys(saisi) as (keyof typeof saisi)[]).some(
      (cle) => saisi[cle] !== this.criteresAppliques[cle]
    );
  }

  /**
   * Vide les champs ET relance la recherche : l'agent qui reinitialise attend
   * la liste complete, pas un formulaire vierge devant des resultats filtres.
   */
  reinitialiserFiltres(): void {
    this.form.reset(this.valeursVides());
    this.rechercher();
  }

  private valeursVides() {
    return {
      search: '',
      matricule: '',
      statut: '',
      classe: '' as string | number,
      sexe: ''
    };
  }

  nouvelEleve(): void {
    this.router.navigate([ROUTE_ELEVE_AJOUT(this.router)]);
  }

  /**
   * Reprise de donnees : import en masse depuis un tableur.
   *
   * La liste n'est rechargee que si des fiches ont ete creees — le dialogue
   * repond `true` dans ce seul cas.
   */
  importerEleves(): void {
    this.dialog
      .open(EleveImportDialogComponent, {
        width: '720px',
        maxWidth: '95vw',
        // L'import peut durer : une fermeture par Echap en plein envoi
        // laisserait l'agent sans rapport sur ce qui a ete enregistre.
        disableClose: true
      })
      .afterClosed()
      .subscribe((importe) => {
        if (importe) {
          this.page = 1;
          this.loadData();
        }
      });
  }

  // L'identifiant transite par le state du Router : il n'apparait pas dans l'URL.
  voirFiche(eleve: Eleve): void {
    this.router.navigate([ROUTE_ELEVE_DETAIL(this.router)], {
      state: { [STATE_ELEVE_ID]: eleve.id }
    });
  }

  editerEleve(eleve: Eleve): void {
    this.router.navigate([ROUTE_ELEVE_EDITION(this.router)], {
      state: { [STATE_ELEVE_ID]: eleve.id }
    });
  }

  /** L'inscription part de l'eleve : on pre-selectionne sa fiche. */
  inscrire(eleve: Eleve): void {
    this.router.navigate([ROUTE_INSCRIPTION_AJOUT(this.router)], {
      state: { [STATE_ELEVE_ID]: eleve.id }
    });
  }

  supprimerEleve(eleve: Eleve): void {
    const data: ConfirmationDialogData = {
      title: "Supprimer l'élève",
      message: `Voulez-vous vraiment supprimer l'élève « ${eleve.nom_complet} » (${eleve.matricule}) ?`,
      confirmLabel: 'Supprimer',
      destructive: true
    };

    this.dialog
      .open(ConfirmatiomModalComponent, { width: '440px', data })
      .afterClosed()
      .subscribe((confirmed) => {
        if (!confirmed) return;

        this.eleveService.delete(eleve.id).subscribe({
          next: (res) => {
            this.notificationService.success(res.message);
            // Supprimer le dernier element d'une page la viderait : on recule.
            if (this.eleves().length === 1 && this.page > 1) this.page--;
            this.loadData();
          },
          error: (err) =>
            this.notificationService.error(
              err?.error?.message ?? 'Erreur lors de la suppression'
            )
        });
      });
  }

  statutLabel(eleve: Eleve): string {
    return (
      STATUTS_INSCRIPTION.find((s) => s.value === eleve.statut_inscription)
        ?.label ?? '—'
    );
  }

  statutClass(eleve: Eleve): string {
    switch (eleve.statut_inscription) {
      case 'NOUVEAU':
        return 'bg-green-100 text-green-800';
      case 'REDOUBLANT':
        return 'bg-amber-100 text-amber-800';
      case 'REINSCRIT':
        return 'bg-blue-100 text-blue-800';
      case 'TRANSFERE':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  }

  /** Une contre-indication medicale doit sauter aux yeux depuis la liste. */
  alerteMedicale(eleve: Eleve): boolean {
    return (
      eleve.aptitude_sportive !== 'APTE' ||
      !!eleve.allergies ||
      !!eleve.maladies_chroniques
    );
  }
}
