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
import { InscriptionService } from 'src/app/auth/services/inscription.service';
import { NotificationService } from 'src/app/auth/services/Notification.service';
import {
  ConfirmationDialogData,
  ConfirmatiomModalComponent
} from 'src/app/features/confirmatiom-modal/confirmatiom-modal.component';
import { AuthService } from 'src/app/auth/services/auth.service';
import { Classe } from 'src/app/interfaces/Classe';
import { ListeLigneComponent } from 'src/app/shared/liste/liste-ligne.component';
import { ListePageComponent } from 'src/app/shared/liste/liste-page.component';
import {
  Inscription,
  STATUTS,
  STATUTS_PAIEMENT,
  TYPES_INSCRIPTION
} from 'src/app/interfaces/Inscription';
import {
  peutSaisirInscription,
  ROUTE_ELEVE_DETAIL,
  ROUTE_INSCRIPTION_AJOUT,
  STATE_ELEVE_ID
} from '../../eleve/eleve-navigation';

@Component({
  selector: 'vex-inscription-list',
  templateUrl: './inscription-list.component.html',
  styleUrls: ['./inscription-list.component.scss'],
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
export class InscriptionListComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly classeService = inject(ClasseService);
  private readonly inscriptionService = inject(InscriptionService);
  private readonly notificationService = inject(NotificationService);
  private readonly dialog = inject(MatDialog);
  private readonly router = inject(Router);
  private readonly authService = inject(AuthService);

  /**
   * Ecran mutualise. La saisie appartient au manager et au surveillant. Le
   * tresorier, lui, consulte la liste avant d'encaisser : le bouton de
   * creation lui est masque.
   */
  readonly peutInscrire = peutSaisirInscription(this.authService.getRole(), this.router);

  /**
   * Le role courant conditionne la portee de la suppression, departagee cote
   * serveur mais anticipee ici pour ne pas proposer un bouton voue a l'echec.
   */
  private readonly role = this.authService.getRole();
  private readonly userId = this.authService.getCurrentUserSync()?.id ?? null;

  readonly inscriptions = this.inscriptionService.inscriptions;
  readonly meta = this.inscriptionService.meta;

  /** Les listes de choix des filtres, reprises des enums du backend. */
  readonly statuts = STATUTS;
  readonly statutsPaiement = STATUTS_PAIEMENT;
  readonly types = TYPES_INSCRIPTION;

  /**
   * Ce que l'agent SAISIT. A distinguer de `criteresAppliques` : tant qu'il
   * n'a pas clique sur « Rechercher », ces valeurs ne filtrent rien.
   */
  readonly form = this.fb.nonNullable.group({
    search: '',
    matricule: '',
    numero: '',
    classe: '' as string | number,
    statut: '',
    paiement: '',
    type: ''
  });

  /**
   * Les criteres reellement appliques a la liste affichee, figes au clic sur
   * « Rechercher ».
   *
   * La pagination relit les criteres a chaque page : sans cette copie, passer
   * a la page 2 embarquerait les filtres tapes mais pas encore valides, et la
   * page 2 ne serait plus la suite de la page 1.
   */
  private criteresAppliques = this.valeursVides();

  classes: Classe[] = [];
  loading = false;

  page = 1;
  perPage = 10;

  /** Id de l'inscription dont la fiche PDF est en cours de téléchargement. */
  downloadingId: number | null = null;

  ngOnInit(): void {
    this.loadData();

    // Les classes alimentent le filtre : elles ne changent pas pendant la
    // navigation, une seule requete suffit.
    this.classeService.getAll().subscribe({
      next: (classes) => (this.classes = classes)
    });
  }

  /**
   * Applique les criteres saisis : unique point d'entree de la recherche, les
   * champs ne declenchent plus rien en changeant de valeur.
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

    this.inscriptionService
      .getList(this.page, this.perPage, criteres.search.trim(), {
        matricule: criteres.matricule.trim() || null,
        numero_inscription: criteres.numero.trim() || null,
        // Le select porte '' quand aucune classe n'est choisie, et l'id
        // numerique sinon : on ne transmet un nombre que dans le second cas.
        classe_id: criteres.classe === '' ? null : Number(criteres.classe),
        statut_inscription: criteres.statut || null,
        statut_paiement: criteres.paiement || null,
        type_inscription: criteres.type || null
      })
      .subscribe({
        next: () => (this.loading = false),
        error: () => {
          this.loading = false;
          this.notificationService.error(
            'Erreur lors du chargement des inscriptions'
          );
        }
      });
  }

  /**
   * Vrai lorsqu'un critere filtre la liste AFFICHEE.
   *
   * Se lit sur les criteres appliques et non sur le formulaire : c'est ce qui
   * fait dire « aucun resultat » plutot que « aucune inscription » quand une
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
      numero: '',
      classe: '' as string | number,
      statut: '',
      paiement: '',
      type: ''
    };
  }

  onPageChange(event: PageEvent): void {
    this.page = event.pageIndex + 1;
    this.perPage = event.pageSize;
    this.loadData();
  }

  nouvelleInscription(): void {
    this.router.navigate([ROUTE_INSCRIPTION_AJOUT(this.router)]);
  }

  voirEleve(inscription: Inscription): void {
    if (inscription.eleve) {
      this.router.navigate([ROUTE_ELEVE_DETAIL(this.router)], {
        state: { [STATE_ELEVE_ID]: inscription.eleve.id }
      });
    }
  }

  /** Le backend refuse d'annuler une inscription deja encaissee. */
  annuler(inscription: Inscription): void {
    if (this.estAnnulee(inscription)) return;

    const data: ConfirmationDialogData = {
      title: "Annuler l'inscription",
      message: `Voulez-vous vraiment annuler l'inscription « ${inscription.numero_inscription} » de ${inscription.eleve?.nom_complet ?? "l'élève"} ?`,
      confirmLabel: 'Annuler l\'inscription',
      cancelLabel: 'Revenir',
      destructive: true
    };

    this.dialog
      .open(ConfirmatiomModalComponent, { width: '460px', data })
      .afterClosed()
      .subscribe((confirmed) => {
        if (!confirmed) return;

        this.inscriptionService.annuler(inscription.id).subscribe({
          next: (res) => {
            this.notificationService.success(res.message);
            this.loadData();
          },
          error: (err) =>
            this.notificationService.error(
              err?.error?.message ?? "Erreur lors de l'annulation"
            )
        });
      });
  }

  supprimer(inscription: Inscription): void {
    const data: ConfirmationDialogData = {
      title: "Supprimer l'inscription",
      message: `Voulez-vous vraiment supprimer l'inscription « ${inscription.numero_inscription} » ? Cette action est irréversible.`,
      confirmLabel: 'Supprimer',
      destructive: true
    };

    this.dialog
      .open(ConfirmatiomModalComponent, { width: '460px', data })
      .afterClosed()
      .subscribe((confirmed) => {
        if (!confirmed) return;

        this.inscriptionService.delete(inscription.id).subscribe({
          next: (res) => {
            this.notificationService.success(res.message);
            // Supprimer le dernier element d'une page la viderait : on recule.
            if (this.inscriptions().length === 1 && this.page > 1) this.page--;
            this.loadData();
          },
          error: (err) =>
            this.notificationService.error(
              err?.error?.message ?? 'Erreur lors de la suppression'
            )
        });
      });
  }

  /** Télécharge la fiche de renseignement (frais + échéancier) en PDF. */
  telechargerFiche(inscription: Inscription): void {
    if (this.downloadingId !== null) return;
    this.downloadingId = inscription.id;

    this.inscriptionService.downloadFichePdf(inscription.id).subscribe({
      next: (blob) => {
        this.downloadingId = null;
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `fiche-renseignement-${inscription.numero_inscription}.pdf`;
        a.click();
        window.URL.revokeObjectURL(url);
      },
      error: () => {
        this.downloadingId = null;
        this.notificationService.error(
          'Erreur lors de la génération de la fiche PDF'
        );
      }
    });
  }

  estAnnulee(i: Inscription): boolean {
    return i.statut_inscription === 'ANNULEE';
  }

  /**
   * Reflete InscriptionService::delete() cote serveur : l'admin supprime
   * sans restriction, le manager et le surveillant seulement une inscription
   * EN_ATTENTE, et le surveillant seulement la sienne. Une reponse 403/422
   * reste possible (paiements/mensualites rattaches), ce controle ne fait
   * qu'eviter les cas deja perdus d'avance.
   */
  peutSupprimer(i: Inscription): boolean {
    if (this.role === 'admin') return true;

    if (i.statut_inscription !== 'EN_ATTENTE') return false;

    if (this.role === 'supervisor') return i.utilisateur_id === this.userId;

    return this.role === 'manager';
  }

  raisonBlocageSuppression(i: Inscription): string {
    if (this.peutSupprimer(i)) return '';
    if (i.statut_inscription !== 'EN_ATTENTE') return 'Seule une inscription en attente peut être supprimée.';
    if (this.role === 'supervisor') return "Vous ne pouvez supprimer que les inscriptions que vous avez créées.";
    return '';
  }

  /** Une inscription deja encaissee ne peut plus etre annulee cote backend. */
  estEncaissee(i: Inscription): boolean {
    return (i.montant_inscription_paye ?? 0) > 0;
  }

  statutLabel(i: Inscription): string {
    switch (i.statut_inscription) {
      case 'EN_ATTENTE':
        return 'En attente';
      case 'VALIDEE':
        return 'Validée';
      case 'ANNULEE':
        return 'Annulée';
      default:
        return '—';
    }
  }

  statutClass(i: Inscription): string {
    switch (i.statut_inscription) {
      case 'EN_ATTENTE':
        return 'bg-amber-100 text-amber-800';
      case 'VALIDEE':
        return 'bg-green-100 text-green-800';
      case 'ANNULEE':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  }

  paiementLabel(i: Inscription): string {
    switch (i.statut_paiement) {
      case 'NON_PAYE':
        return 'Non payé';
      case 'PARTIEL':
        return 'Partiel';
      case 'PAYE':
        return 'Payé';
      default:
        return '—';
    }
  }

  paiementClass(i: Inscription): string {
    switch (i.statut_paiement) {
      case 'PAYE':
        return 'text-green-700 font-medium';
      case 'PARTIEL':
        return 'text-amber-700 font-medium';
      default:
        return 'text-hint';
    }
  }

  typeLabel(i: Inscription): string {
    return i.type_inscription === 'REINSCRIPTION' ? 'Réinscription' : 'Nouvelle';
  }
}
