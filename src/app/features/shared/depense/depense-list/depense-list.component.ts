import { CommonModule } from '@angular/common';
import { Component, DestroyRef, inject, OnInit } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  UntypedFormControl
} from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatNativeDateModule } from '@angular/material/core';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatDividerModule } from '@angular/material/divider';
import { MatMenuModule } from '@angular/material/menu';
import { PageEvent } from '@angular/material/paginator';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';
import { fadeInRight400ms } from '@vex/animations/fade-in-right.animation';
import { scaleIn400ms } from '@vex/animations/scale-in.animation';
import { stagger40ms } from '@vex/animations/stagger.animation';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { AuthService } from 'src/app/auth/services/auth.service';
import { DepenseService } from 'src/app/auth/services/depense.service';
import { NotificationService } from 'src/app/auth/services/Notification.service';
import {
  ConfirmationDialogData,
  ConfirmatiomModalComponent
} from 'src/app/features/confirmatiom-modal/confirmatiom-modal.component';
import { toApiDate } from 'src/app/features/manager/eleve/eleve-form.utils';
import {
  Depense,
  DepenseFiltres,
  DepenseReferentiels,
  DepenseTotaux,
  OptionReferentiel
} from 'src/app/interfaces/Depense';
import { ListeLigneComponent } from 'src/app/shared/liste/liste-ligne.component';
import { ListePageComponent } from 'src/app/shared/liste/liste-page.component';
import { DepenseAddEditComponent } from '../depense-add-edit/depense-add-edit.component';
import {
  DepenseRefusDialogComponent,
  DepenseRefusDialogData
} from '../depense-refus-dialog/depense-refus-dialog.component';

/** Présélections de période, plus « perso » pour une plage libre. */
type PeriodePreset =
  | 'tous'
  | 'jour'
  | '7j'
  | '30j'
  | 'mois'
  | 'mois_prec'
  | 'perso';

@Component({
  selector: 'vex-depense-list',
  templateUrl: './depense-list.component.html',
  animations: [stagger40ms, scaleIn400ms, fadeInRight400ms],
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatIconModule,
    MatButtonModule,
    MatMenuModule,
    MatDividerModule,
    MatTooltipModule,
    MatProgressSpinnerModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatDialogModule,
    ListePageComponent,
    ListeLigneComponent
  ]
})
export class DepenseListComponent implements OnInit {
  private readonly destroyRef = inject(DestroyRef);
  private readonly fb = inject(FormBuilder);
  private readonly depenseService = inject(DepenseService);
  private readonly notificationService = inject(NotificationService);
  private readonly dialog = inject(MatDialog);
  private readonly authService = inject(AuthService);

  readonly depenses = this.depenseService.depenses;
  readonly meta = this.depenseService.meta;

  searchCtrl = new UntypedFormControl('');
  loading = false;

  page = 1;
  perPage = 10;

  /** Référentiels de saisie, partagés avec le dialog. */
  categories: OptionReferentiel[] = [];
  modesPaiement: OptionReferentiel[] = [];
  statuts: OptionReferentiel[] = [];

  /**
   * Valider engage l'établissement : réservé au manager et à l'admin. Le
   * trésorier saisit, il ne s'autorise pas lui-même — c'est cette séparation
   * qui donne son sens au circuit. Le serveur applique la même règle ; ceci
   * évite d'afficher des boutons qui repartiraient en 403.
   */
  readonly peutValider = ['admin', 'manager'].includes(
    this.authService.getRole()
  );

  /** Nom de l'année scolaire en cours, affiché dans le bandeau récapitulatif. */
  anneeScolaireNom: string | null = null;

  /** Totaux du périmètre filtré (bandeau récapitulatif). */
  totaux: DepenseTotaux | null = null;

  /** Période sélectionnée ; « toutes les dates » par défaut. */
  periode: PeriodePreset = 'tous';

  readonly periodePresets: { value: PeriodePreset; label: string }[] = [
    { value: 'tous', label: 'Toutes les dates' },
    { value: 'jour', label: "Aujourd'hui" },
    { value: '7j', label: '7 derniers jours' },
    { value: '30j', label: '30 derniers jours' },
    { value: 'mois', label: 'Ce mois-ci' },
    { value: 'mois_prec', label: 'Mois précédent' },
    { value: 'perso', label: 'Période personnalisée' }
  ];

  filtresForm: FormGroup = this.fb.group({
    categorie: [''],
    mode_paiement: [''],
    statut: [''],
    date_from: [null as Date | null],
    date_to: [null as Date | null]
  });

  ngOnInit(): void {
    this.chargerReferentiels();
    this.chargerMois();
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

    this.filtresForm.valueChanges
      .pipe(debounceTime(300), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.page = 1;
        this.loadData();
      });
  }

  private chargerReferentiels(): void {
    this.depenseService.getReferentiels().subscribe((ref: DepenseReferentiels | null) => {
      this.categories = ref?.categories ?? [];
      this.modesPaiement = ref?.modes_paiement ?? [];
      this.statuts = ref?.statuts ?? [];
    });
  }

  private chargerMois(): void {
    this.depenseService.getMoisAnneeEnCours().subscribe((res) => {
      this.anneeScolaireNom = res?.annee_scolaire?.nom ?? null;
    });
  }

  loadData(): void {
    this.loading = true;
    const filtres = this.filtresActuels();

    this.depenseService.getList(this.page, this.perPage, filtres).subscribe({
      next: () => (this.loading = false),
      error: () => {
        this.loading = false;
        this.notificationService.error(
          'Erreur lors du chargement des dépenses'
        );
      }
    });

    // Les totaux suivent exactement le même filtrage que la liste.
    this.depenseService
      .getTotaux(filtres)
      .subscribe((t) => (this.totaux = t));
  }

  /** Construit les critères : recherche, catégorie, mode et plage de dates. */
  private filtresActuels(): DepenseFiltres {
    const f = this.filtresForm.value;

    const filtres: DepenseFiltres = {
      search: (this.searchCtrl.value ?? '').trim() || undefined,
      categorie: f.categorie || undefined,
      mode_paiement: f.mode_paiement || undefined,
      statut: f.statut || undefined
    };

    if (this.periode === 'perso') {
      filtres.date_from = f.date_from ? toApiDate(f.date_from) ?? undefined : undefined;
      filtres.date_to = f.date_to ? toApiDate(f.date_to) ?? undefined : undefined;
    } else {
      const plage = this.plageDates();
      if (plage) {
        filtres.date_from = toApiDate(plage.from) ?? undefined;
        filtres.date_to = toApiDate(plage.to) ?? undefined;
      }
    }

    return filtres;
  }

  /** Traduit un préset en plage [du, au] ; `null` pour « toutes les dates ». */
  private plageDates(): { from: Date; to: Date } | null {
    const now = new Date();
    const jour = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

    switch (this.periode) {
      case 'jour': {
        const d = jour(now);
        return { from: d, to: d };
      }
      case '7j': {
        const to = jour(now);
        const from = new Date(to);
        from.setDate(from.getDate() - 6);
        return { from, to };
      }
      case '30j': {
        const to = jour(now);
        const from = new Date(to);
        from.setDate(from.getDate() - 29);
        return { from, to };
      }
      case 'mois':
        return {
          from: new Date(now.getFullYear(), now.getMonth(), 1),
          to: new Date(now.getFullYear(), now.getMonth() + 1, 0)
        };
      case 'mois_prec':
        return {
          from: new Date(now.getFullYear(), now.getMonth() - 1, 1),
          to: new Date(now.getFullYear(), now.getMonth(), 0)
        };
      default:
        return null;
    }
  }

  /** Changement de période : on relance, en vidant la plage libre si besoin. */
  onPeriodeChange(periode: PeriodePreset): void {
    this.periode = periode;
    if (periode !== 'perso') {
      this.filtresForm.patchValue(
        { date_from: null, date_to: null },
        { emitEvent: false }
      );
    }
    this.page = 1;
    this.loadData();
  }

  resetFiltres(): void {
    this.searchCtrl.setValue('', { emitEvent: false });
    this.periode = 'tous';
    this.filtresForm.reset(
      { categorie: '', mode_paiement: '', statut: '', date_from: null, date_to: null },
      { emitEvent: false }
    );
    this.page = 1;
    this.loadData();
  }

  get filtresActifs(): boolean {
    const f = this.filtresForm.value;
    return !!(
      (this.searchCtrl.value ?? '').trim() ||
      f.categorie ||
      f.mode_paiement ||
      this.periode !== 'tous'
    );
  }

  onPageChange(event: PageEvent): void {
    this.page = event.pageIndex + 1;
    this.perPage = event.pageSize;
    this.loadData();
  }

  openAddDialog(): void {
    this.dialog
      .open(DepenseAddEditComponent, {
        width: '640px',
        disableClose: true,
        data: {
          isEdit: false,
          categories: this.categories,
          modesPaiement: this.modesPaiement
        }
      })
      .afterClosed()
      .subscribe((created) => {
        if (created) {
          this.chargerMois();
          this.loadData();
        }
      });
  }

  editDepense(depense: Depense): void {
    this.dialog
      .open(DepenseAddEditComponent, {
        width: '640px',
        disableClose: true,
        data: {
          isEdit: true,
          depense,
          categories: this.categories,
          modesPaiement: this.modesPaiement
        }
      })
      .afterClosed()
      .subscribe((updated) => {
        if (updated) {
          this.chargerMois();
          this.loadData();
        }
      });
  }

  /**
   * Valide la dépense : elle entre alors dans les totaux et le bilan. On
   * confirme d'abord, l'acte engageant l'établissement.
   */
  validerDepense(depense: Depense): void {
    const data: ConfirmationDialogData = {
      title: 'Valider la dépense',
      message: `Valider « ${depense.libelle} » (${this.formatMontant(depense.montant)}) ? Elle sera comptabilisée dans les totaux et le bilan.`,
      confirmLabel: 'Valider'
    };

    this.dialog
      .open(ConfirmatiomModalComponent, { width: '460px', data })
      .afterClosed()
      .subscribe((confirmed) => {
        if (!confirmed) return;

        this.depenseService.valider(depense.id).subscribe({
          next: (res) => {
            this.notificationService.success(res.message);
            // Le mois et les totaux changent : la dépense compte désormais.
            this.chargerMois();
            this.loadData();
          },
          error: (err) =>
            this.notificationService.error(
              err?.error?.message ?? 'Erreur lors de la validation'
            )
        });
      });
  }

  /** Refuse la dépense. Le motif est saisi dans un dialog dédié. */
  refuserDepense(depense: Depense): void {
    this.dialog
      .open(DepenseRefusDialogComponent, {
        width: '480px',
        data: {
          libelle: depense.libelle,
          montant: this.formatMontant(depense.montant)
        } as DepenseRefusDialogData
      })
      .afterClosed()
      .subscribe((motif: string | null | undefined) => {
        if (!motif) return;

        this.depenseService.refuser(depense.id, motif).subscribe({
          next: (res) => {
            this.notificationService.success(res.message);
            this.loadData();
          },
          error: (err) =>
            this.notificationService.error(
              err?.error?.message ?? 'Erreur lors du refus'
            )
        });
      });
  }

  deleteDepense(depense: Depense): void {
    const data: ConfirmationDialogData = {
      title: 'Supprimer la dépense',
      message: `Voulez-vous vraiment supprimer la dépense « ${depense.libelle} » (${this.formatMontant(depense.montant)}) ?`,
      confirmLabel: 'Supprimer',
      destructive: true
    };

    this.dialog
      .open(ConfirmatiomModalComponent, { width: '460px', data })
      .afterClosed()
      .subscribe((confirmed) => {
        if (!confirmed) return;

        this.depenseService.delete(depense.id).subscribe({
          next: (res) => {
            this.notificationService.success(res.message);
            if (this.depenses().length === 1 && this.page > 1) this.page--;
            this.chargerMois();
            this.loadData();
          },
          error: (err) =>
            this.notificationService.error(
              err?.error?.message ?? 'Erreur lors de la suppression'
            )
        });
      });
  }

  formatMontant(montant: number): string {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'XOF',
      maximumFractionDigits: 0
    }).format(montant);
  }
}
