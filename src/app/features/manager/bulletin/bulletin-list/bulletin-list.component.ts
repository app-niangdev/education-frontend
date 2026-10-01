import { CommonModule } from '@angular/common';
import { Component, DestroyRef, inject, OnInit } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ReactiveFormsModule, UntypedFormControl } from '@angular/forms';
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
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { AnneeScolaireService } from 'src/app/auth/services/annee-scolaire.service';
import { AuthService } from 'src/app/auth/services/auth.service';
import { BulletinService } from 'src/app/auth/services/bulletin.service';
import { ClasseService } from 'src/app/auth/services/classe.service';
import { NotificationService } from 'src/app/auth/services/Notification.service';
import { PeriodeService } from 'src/app/auth/services/periode.service';
import {
  ConfirmationDialogData,
  ConfirmatiomModalComponent
} from 'src/app/features/confirmatiom-modal/confirmatiom-modal.component';
import { Bulletin, STATUTS_BULLETIN, StatutBulletin } from 'src/app/interfaces/Bulletin';
import { Classe } from 'src/app/interfaces/Classe';
import { Periode } from 'src/app/interfaces/Periode';
import { ListeLigneComponent } from 'src/app/shared/liste/liste-ligne.component';
import { ListePageComponent } from 'src/app/shared/liste/liste-page.component';
import {
  ROUTE_BULLETIN_DETAIL,
  STATE_BULLETIN_CONTEXTE,
  STATE_BULLETIN_ID
} from '../bulletin-navigation';

/**
 * Liste des bulletins d'une classe pour une periode.
 *
 * La generation et la publication portent sur la classe entiere : le rang d'un
 * eleve n'a de sens que rapporte a ses camarades. Ces actions sont donc
 * conditionnees a la selection prealable d'une classe ET d'une periode.
 *
 * Le surveillant consulte et imprime, sans jamais generer ni publier.
 */
@Component({
  selector: 'vex-bulletin-list',
  templateUrl: './bulletin-list.component.html',
  styleUrls: ['./bulletin-list.component.scss'],
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
export class BulletinListComponent implements OnInit {
  private readonly destroyRef = inject(DestroyRef);
  private readonly bulletinService = inject(BulletinService);
  private readonly classeService = inject(ClasseService);
  private readonly periodeService = inject(PeriodeService);
  private readonly anneeService = inject(AnneeScolaireService);
  private readonly notificationService = inject(NotificationService);
  private readonly authService = inject(AuthService);
  private readonly dialog = inject(MatDialog);
  private readonly router = inject(Router);

  readonly bulletins = this.bulletinService.bulletins;
  readonly meta = this.bulletinService.meta;
  readonly statuts = STATUTS_BULLETIN;

  searchCtrl = new UntypedFormControl('');
  classeCtrl = new UntypedFormControl(null);
  periodeCtrl = new UntypedFormControl(null);
  statutCtrl = new UntypedFormControl(null);

  loading = false;
  generating = false;
  publishing = false;
  downloadingClasse = false;
  /** Identifiant du bulletin dont le PDF est en cours : garde anti double-clic. */
  downloadingId: number | null = null;

  classes: Classe[] = [];
  periodes: Periode[] = [];

  /**
   * Vrai quand la date limite de saisie des notes n'est pas encore passee :
   * les bulletins generes sont alors provisoires.
   */
  saisieEncoreOuverte = false;

  page = 1;
  perPage = 10;

  ngOnInit(): void {
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

    [this.classeCtrl, this.periodeCtrl, this.statutCtrl].forEach((ctrl) =>
      ctrl.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
        this.page = 1;
        this.saisieEncoreOuverte = false;
        this.loadData();
      })
    );
  }

  /** Les classes et les periodes de l'annee en cours. */
  private loadReferences(): void {
    this.classeService.getAll().subscribe((classes) => (this.classes = classes));

    this.anneeService.getList(1, 100).subscribe((annees) => {
      const active = annees.find((a) => a.en_cours) ?? annees[0];
      if (active) {
        this.periodeService
          .getByAnnee(active.id)
          .subscribe((periodes) => (this.periodes = periodes));
      }
    });
  }

  loadData(): void {
    this.loading = true;
    this.bulletinService
      .getList(
        this.page,
        this.perPage,
        (this.searchCtrl.value ?? '').trim(),
        this.classeCtrl.value,
        this.periodeCtrl.value,
        this.statutCtrl.value
      )
      .subscribe({
        next: () => (this.loading = false),
        error: () => {
          this.loading = false;
          this.notificationService.error('Erreur lors du chargement des bulletins');
        }
      });
  }

  onPageChange(event: PageEvent): void {
    this.page = event.pageIndex + 1;
    this.perPage = event.pageSize;
    this.loadData();
  }

  // ------------------------------------------------------------------
  // Etat de l'ecran
  // ------------------------------------------------------------------

  /** Le surveillant consulte : la generation et la publication lui sont fermees. */
  get lectureSeule(): boolean {
    return this.authService.isSupervisor();
  }

  /** Generer et publier supposent une classe ET une periode choisies. */
  get contexteChoisi(): boolean {
    return !!this.classeCtrl.value && !!this.periodeCtrl.value;
  }

  get filtreActif(): boolean {
    return (
      !!(this.searchCtrl.value ?? '').trim() ||
      !!this.classeCtrl.value ||
      !!this.periodeCtrl.value ||
      !!this.statutCtrl.value
    );
  }

  get nomClasseChoisie(): string {
    return this.classes.find((c) => c.id === this.classeCtrl.value)?.nom ?? '';
  }

  get nomPeriodeChoisie(): string {
    return this.periodes.find((p) => p.id === this.periodeCtrl.value)?.libelle ?? '';
  }

  /** Vrai si la selection courante contient au moins un bulletin publie. */
  get contientPublies(): boolean {
    return this.bulletins().some((b) => b.statut === 'PUBLIE');
  }

  get contientBrouillons(): boolean {
    return this.bulletins().some((b) => b.statut === 'BROUILLON');
  }

  reinitialiserFiltres(): void {
    this.searchCtrl.setValue('', { emitEvent: false });
    this.classeCtrl.setValue(null, { emitEvent: false });
    this.periodeCtrl.setValue(null, { emitEvent: false });
    this.statutCtrl.setValue(null);
  }

  statutClass(statut: StatutBulletin): string {
    return statut === 'PUBLIE'
      ? 'bg-green-100 text-green-800'
      : 'bg-amber-100 text-amber-800';
  }

  /** Les decimaux arrivent en chaine depuis Laravel : on normalise a l'affichage. */
  format(valeur: string | number | null | undefined, decimales = 2): string {
    if (valeur === null || valeur === undefined || valeur === '') return '—';

    const nombre = Number(valeur);
    return Number.isFinite(nombre)
      ? nombre.toLocaleString('fr-FR', {
          minimumFractionDigits: decimales,
          maximumFractionDigits: decimales
        })
      : '—';
  }

  // ------------------------------------------------------------------
  // Actions
  // ------------------------------------------------------------------

  genererBulletins(): void {
    if (!this.contexteChoisi || this.generating) return;

    const existants = this.bulletins().length;
    const message = existants
      ? `Les bulletins de « ${this.nomClasseChoisie} » pour ${this.nomPeriodeChoisie} vont être recalculés à partir des notes actuelles. Les décisions du conseil de classe déjà saisies sont conservées.`
      : `Les bulletins de « ${this.nomClasseChoisie} » vont être générés pour ${this.nomPeriodeChoisie}.`;

    const data: ConfirmationDialogData = {
      title: existants ? 'Recalculer les bulletins' : 'Générer les bulletins',
      message,
      confirmLabel: existants ? 'Recalculer' : 'Générer',
      destructive: false
    };

    this.dialog
      .open(ConfirmatiomModalComponent, { width: '440px', data })
      .afterClosed()
      .subscribe((confirme) => {
        if (!confirme) return;

        this.generating = true;
        this.bulletinService
          .generer({
            classe_id: this.classeCtrl.value,
            periode_id: this.periodeCtrl.value
          })
          .subscribe({
            next: (res) => {
              this.generating = false;
              this.saisieEncoreOuverte = !!res.payload?.saisie_encore_ouverte;
              this.notificationService.success(res.message);
              this.loadData();
            },
            error: (err) => {
              this.generating = false;
              this.notificationService.error(
                err?.error?.message ?? 'Erreur lors de la génération des bulletins'
              );
            }
          });
      });
  }

  publierClasse(): void {
    if (!this.contexteChoisi || this.publishing) return;

    const data: ConfirmationDialogData = {
      title: 'Publier les bulletins',
      message: `Les bulletins de « ${this.nomClasseChoisie} » pour ${this.nomPeriodeChoisie} vont être publiés. Une fois publiés, ils sont figés : une correction de note ne les modifiera plus.`,
      confirmLabel: 'Publier',
      destructive: false
    };

    this.dialog
      .open(ConfirmatiomModalComponent, { width: '440px', data })
      .afterClosed()
      .subscribe((confirme) => {
        if (!confirme) return;

        this.publishing = true;
        this.bulletinService
          .publierClasse({
            classe_id: this.classeCtrl.value,
            periode_id: this.periodeCtrl.value
          })
          .subscribe({
            next: (res) => {
              this.publishing = false;
              this.notificationService.success(res.message);
              this.loadData();
            },
            error: (err) => {
              this.publishing = false;
              this.notificationService.error(
                err?.error?.message ?? 'Erreur lors de la publication'
              );
            }
          });
      });
  }

  depublierClasse(): void {
    if (!this.contexteChoisi || this.publishing) return;

    // Depublier casse l'immuabilite d'un document deja remis aux familles :
    // on le presente comme une action destructive.
    const data: ConfirmationDialogData = {
      title: 'Dépublier les bulletins',
      message: `Les bulletins de « ${this.nomClasseChoisie} » repasseront en brouillon et pourront être recalculés. Les exemplaires déjà remis aux familles ne correspondront plus à ce qui sera réédité.`,
      confirmLabel: 'Dépublier',
      destructive: true
    };

    this.dialog
      .open(ConfirmatiomModalComponent, { width: '440px', data })
      .afterClosed()
      .subscribe((confirme) => {
        if (!confirme) return;

        this.publishing = true;
        this.bulletinService
          .depublierClasse({
            classe_id: this.classeCtrl.value,
            periode_id: this.periodeCtrl.value
          })
          .subscribe({
            next: (res) => {
              this.publishing = false;
              this.notificationService.success(res.message);
              this.loadData();
            },
            error: (err) => {
              this.publishing = false;
              this.notificationService.error(
                err?.error?.message ?? 'Erreur lors de la dépublication'
              );
            }
          });
      });
  }

  voirDetail(bulletin: Bulletin): void {
    this.router.navigate([ROUTE_BULLETIN_DETAIL(this.router)], {
      state: {
        [STATE_BULLETIN_ID]: bulletin.id,
        [STATE_BULLETIN_CONTEXTE]: {
          classeId: this.classeCtrl.value,
          periodeId: this.periodeCtrl.value
        }
      }
    });
  }

  telechargerPdf(bulletin: Bulletin): void {
    if (this.downloadingId !== null) return;

    this.downloadingId = bulletin.id;
    this.bulletinService.downloadPdf(bulletin.id).subscribe({
      next: (blob) => {
        this.downloadingId = null;
        this.enregistrer(
          blob,
          `bulletin-${bulletin.eleve_prenom}-${bulletin.eleve_nom}.pdf`
        );
      },
      error: () => {
        this.downloadingId = null;
        this.notificationService.error('Erreur lors de la génération du PDF');
      }
    });
  }

  telechargerPdfClasse(): void {
    if (!this.contexteChoisi || this.downloadingClasse) return;

    this.downloadingClasse = true;
    this.bulletinService
      .downloadPdfClasse(this.classeCtrl.value, this.periodeCtrl.value)
      .subscribe({
        next: (blob) => {
          this.downloadingClasse = false;
          this.enregistrer(
            blob,
            `bulletins-${this.nomClasseChoisie}-${this.nomPeriodeChoisie}.pdf`
          );
        },
        error: () => {
          this.downloadingClasse = false;
          this.notificationService.error(
            'Erreur lors de la génération des bulletins de la classe'
          );
        }
      });
  }

  private enregistrer(blob: Blob, nomFichier: string): void {
    const url = window.URL.createObjectURL(blob);
    const lien = document.createElement('a');
    lien.href = url;
    lien.download = nomFichier;
    lien.click();
    window.URL.revokeObjectURL(url);
  }
}
