import { CommonModule } from '@angular/common';
import { Component, DestroyRef, inject, OnInit } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ReactiveFormsModule, UntypedFormControl } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatMenuModule } from '@angular/material/menu';
import { PageEvent } from '@angular/material/paginator';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Router } from '@angular/router';
import { fadeInRight400ms } from '@vex/animations/fade-in-right.animation';
import { scaleIn400ms } from '@vex/animations/scale-in.animation';
import { stagger40ms } from '@vex/animations/stagger.animation';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { AssiduiteService } from 'src/app/auth/services/assiduite.service';
import { AuthService } from 'src/app/auth/services/auth.service';
import { ClasseService } from 'src/app/auth/services/classe.service';
import { NotificationService } from 'src/app/auth/services/Notification.service';
import {
  ConfirmationDialogData,
  ConfirmatiomModalComponent
} from 'src/app/features/confirmatiom-modal/confirmatiom-modal.component';
import {
  Presence,
  STATUTS_PRESENCE,
  StatutPresence
} from 'src/app/interfaces/Assiduite';
import { Classe } from 'src/app/interfaces/Classe';
import { ListeLigneComponent } from 'src/app/shared/liste/liste-ligne.component';
import { ListePageComponent } from 'src/app/shared/liste/liste-page.component';
import { CorrigerDialogComponent } from '../corriger-dialog/corriger-dialog.component';
import { JustifierDialogComponent } from '../justifier-dialog/justifier-dialog.component';
import {
  ROUTE_FICHE_ELEVE,
  STATE_ELEVE_ASSIDUITE,
  STATE_FILTRES_ASSIDUITE,
  lireFiltresDepuisState
} from '../assiduite-navigation';

/**
 * Le registre d'assiduite : toutes les anomalies relevees, filtrables.
 *
 * C'est l'outil de travail du surveillant : reperer ce qui reste a justifier,
 * corriger une saisie erronee, ouvrir la fiche d'un eleve. Le manager y a
 * acces pour la supervision.
 *
 * Le backend borne deja la vue d'un enseignant a ses classes et exclut le
 * tresorier ; ce composant ne refait pas ces controles.
 */
@Component({
  selector: 'vex-assiduite-list',
  templateUrl: './assiduite-list.component.html',
  styleUrls: ['./assiduite-list.component.scss'],
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
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatDatepickerModule,
    MatDialogModule,
    ListePageComponent,
    ListeLigneComponent
  ]
})
export class AssiduiteListComponent implements OnInit {
  private readonly destroyRef = inject(DestroyRef);
  private readonly assiduiteService = inject(AssiduiteService);
  private readonly classeService = inject(ClasseService);
  private readonly notificationService = inject(NotificationService);
  private readonly authService = inject(AuthService);
  private readonly dialog = inject(MatDialog);
  private readonly router = inject(Router);

  readonly presences = this.assiduiteService.presences;
  readonly meta = this.assiduiteService.meta;
  readonly statuts = STATUTS_PRESENCE;

  searchCtrl = new UntypedFormControl('');
  classeCtrl = new UntypedFormControl(null);
  statutCtrl = new UntypedFormControl(null);
  justifieCtrl = new UntypedFormControl(null);
  duCtrl = new UntypedFormControl(null);
  auCtrl = new UntypedFormControl(null);

  classes: Classe[] = [];
  loading = false;
  downloadingId: number | null = null;
  downloadingFeuille = false;

  page = 1;
  perPage = 10;

  ngOnInit(): void {
    this.restaurerFiltres();
    this.loadReferences();
    this.loadData();

    this.searchCtrl.valueChanges
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe(() => {
        this.page = 1;
        this.loadData();
      });

    [this.classeCtrl, this.statutCtrl, this.justifieCtrl, this.duCtrl, this.auCtrl].forEach(
      (ctrl) =>
        ctrl.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
          this.page = 1;
          this.loadData();
        })
    );
  }

  /** Au retour de la fiche élève, on retrouve le filtrage d'origine. */
  private restaurerFiltres(): void {
    const filtres = lireFiltresDepuisState(this.router);
    if (!filtres) return;

    this.classeCtrl.setValue(filtres.classeId, { emitEvent: false });
    this.statutCtrl.setValue(filtres.statut, { emitEvent: false });
    this.justifieCtrl.setValue(filtres.justifie, { emitEvent: false });
    this.duCtrl.setValue(filtres.du, { emitEvent: false });
    this.auCtrl.setValue(filtres.au, { emitEvent: false });
  }

  private loadReferences(): void {
    this.classeService.getAll().subscribe((classes) => (this.classes = classes));
  }

  loadData(): void {
    this.loading = true;
    this.assiduiteService
      .getList(
        this.page,
        this.perPage,
        (this.searchCtrl.value ?? '').trim(),
        this.classeCtrl.value,
        null,
        this.statutCtrl.value,
        this.justifieCtrl.value,
        this.dateIso(this.duCtrl.value),
        this.dateIso(this.auCtrl.value)
      )
      .subscribe({
        next: () => (this.loading = false),
        error: () => {
          this.loading = false;
          this.notificationService.error('Erreur lors du chargement du registre');
        }
      });
  }

  onPageChange(event: PageEvent): void {
    this.page = event.pageIndex + 1;
    this.perPage = event.pageSize;
    this.loadData();
  }

  // ------------------------------------------------------------------
  // État
  // ------------------------------------------------------------------

  /**
   * Justifier et corriger sont des actes de la vie scolaire : l'enseignant
   * constate l'absence, il ne decide pas de sa legitimite. Le backend renvoie
   * de toute facon 403 ; on masque les boutons pour ne pas les proposer en vain.
   */
  get peutJustifier(): boolean {
    return this.authService.getRole() !== 'teacher';
  }

  get filtreActif(): boolean {
    return (
      !!(this.searchCtrl.value ?? '').trim() ||
      !!this.classeCtrl.value ||
      !!this.statutCtrl.value ||
      this.justifieCtrl.value !== null ||
      !!this.duCtrl.value ||
      !!this.auCtrl.value
    );
  }

  reinitialiserFiltres(): void {
    this.searchCtrl.setValue('', { emitEvent: false });
    this.classeCtrl.setValue(null, { emitEvent: false });
    this.statutCtrl.setValue(null, { emitEvent: false });
    this.justifieCtrl.setValue(null, { emitEvent: false });
    this.duCtrl.setValue(null, { emitEvent: false });
    this.auCtrl.setValue(null);
  }

  /** Le datepicker rend un Date ; l'API attend 'YYYY-MM-DD'. */
  private dateIso(valeur: unknown): string | null {
    if (!valeur) return null;

    const date = valeur instanceof Date ? valeur : new Date(valeur as string);
    if (Number.isNaN(date.getTime())) return null;

    // toISOString() bascule en UTC et peut reculer d'un jour.
    const mois = `${date.getMonth() + 1}`.padStart(2, '0');
    const jour = `${date.getDate()}`.padStart(2, '0');
    return `${date.getFullYear()}-${mois}-${jour}`;
  }

  statutClass(statut: StatutPresence): string {
    return {
      ABSENT: 'bg-red-100 text-red-800',
      RETARD: 'bg-amber-100 text-amber-800',
      RENVOYE: 'bg-purple-100 text-purple-800'
    }[statut];
  }

  matiere(presence: Presence): string {
    return presence.seance?.affectation?.classe_matiere?.matiere?.nom ?? '—';
  }

  classe(presence: Presence): string {
    return presence.seance?.classe?.nom ?? '—';
  }

  creneau(presence: Presence): string {
    const debut = presence.seance?.heure_debut?.slice(0, 5) ?? '';
    const fin = presence.seance?.heure_fin?.slice(0, 5) ?? '';
    return debut && fin ? `${debut} – ${fin}` : '';
  }

  // ------------------------------------------------------------------
  // Actions
  // ------------------------------------------------------------------

  justifier(presence: Presence): void {
    this.dialog
      .open(JustifierDialogComponent, {
        width: '640px',
        disableClose: true,
        data: { presence }
      })
      .afterClosed()
      .subscribe((enregistre) => {
        if (enregistre) this.loadData();
      });
  }

  corriger(presence: Presence): void {
    this.dialog
      .open(CorrigerDialogComponent, {
        width: '520px',
        disableClose: true,
        data: { presence }
      })
      .afterClosed()
      .subscribe((enregistre) => {
        if (enregistre) this.loadData();
      });
  }

  supprimer(presence: Presence): void {
    const data: ConfirmationDialogData = {
      title: "Supprimer l'anomalie",
      message: `L'anomalie « ${presence.statut_libelle} » de ${presence.eleve?.nom_complet} sera supprimée. Les compteurs du bulletin seront recalculés à la prochaine génération.`,
      confirmLabel: 'Supprimer',
      destructive: true
    };

    this.dialog
      .open(ConfirmatiomModalComponent, { width: '440px', data })
      .afterClosed()
      .subscribe((confirme) => {
        if (!confirme) return;

        this.assiduiteService.delete(presence.id).subscribe({
          next: (res) => {
            this.notificationService.success(res.message);
            if (this.presences().length === 1 && this.page > 1) this.page--;
            this.loadData();
          },
          error: (err) =>
            this.notificationService.error(
              err?.error?.message ?? 'Erreur lors de la suppression'
            )
        });
      });
  }

  voirFicheEleve(presence: Presence): void {
    this.router.navigate([ROUTE_FICHE_ELEVE(this.router)], {
      state: {
        [STATE_ELEVE_ASSIDUITE]: presence.eleve_id,
        [STATE_FILTRES_ASSIDUITE]: {
          classeId: this.classeCtrl.value,
          statut: this.statutCtrl.value,
          justifie: this.justifieCtrl.value,
          du: this.dateIso(this.duCtrl.value),
          au: this.dateIso(this.auCtrl.value)
        }
      }
    });
  }

  telechargerJustificatif(presence: Presence): void {
    if (presence.justificatif_url) {
      window.open(presence.justificatif_url, '_blank', 'noopener');
    }
  }

  /**
   * Feuille d'appel vierge a imprimer, quand il n'y a pas d'ecran en classe.
   * Elle porte sur la classe filtree et la date de debut choisie, a defaut
   * aujourd'hui.
   */
  telechargerFeuilleVierge(): void {
    const classeId = this.classeCtrl.value;

    if (!classeId) {
      this.notificationService.info(
        'Choisissez une classe pour imprimer sa feuille d\'appel.'
      );
      return;
    }

    if (this.downloadingFeuille) return;

    const date = this.dateIso(this.duCtrl.value) ?? this.dateIso(new Date());
    if (!date) return;

    this.downloadingFeuille = true;
    this.assiduiteService.downloadFeuilleViergePdf(classeId, date).subscribe({
      next: (blob) => {
        this.downloadingFeuille = false;
        const url = window.URL.createObjectURL(blob);
        const lien = document.createElement('a');
        lien.href = url;
        lien.download = `feuille-appel-${date}.pdf`;
        lien.click();
        window.URL.revokeObjectURL(url);
      },
      error: (err) => {
        this.downloadingFeuille = false;
        this.notificationService.error(
          err?.error?.message ?? "Erreur lors de la génération de la feuille d'appel"
        );
      }
    });
  }
}
