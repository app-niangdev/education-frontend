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
import { EvaluationService } from 'src/app/auth/services/evaluation.service';
import { NotificationService } from 'src/app/auth/services/Notification.service';
import { PeriodeService } from 'src/app/auth/services/periode.service';
import {
  ConfirmationDialogData,
  ConfirmatiomModalComponent
} from 'src/app/features/confirmatiom-modal/confirmatiom-modal.component';
import { Affectation } from 'src/app/interfaces/ClasseMatiere';
import { Evaluation, TYPES_EVALUATION } from 'src/app/interfaces/Evaluation';
import { Periode } from 'src/app/interfaces/Periode';
import { ListeLigneComponent } from 'src/app/shared/liste/liste-ligne.component';
import { ListePageComponent } from 'src/app/shared/liste/liste-page.component';
import { EvaluationDialogComponent } from '../evaluation-dialog/evaluation-dialog.component';

@Component({
  selector: 'vex-evaluation-list',
  templateUrl: './evaluation-list.component.html',
  styleUrls: ['./evaluation-list.component.scss'],
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
export class EvaluationListComponent implements OnInit {
  private readonly destroyRef = inject(DestroyRef);
  private readonly evaluationService = inject(EvaluationService);
  private readonly periodeService = inject(PeriodeService);
  private readonly anneeService = inject(AnneeScolaireService);
  private readonly notificationService = inject(NotificationService);
  private readonly dialog = inject(MatDialog);
  private readonly router = inject(Router);

  readonly evaluations = this.evaluationService.evaluations;
  readonly meta = this.evaluationService.meta;

  searchCtrl = new UntypedFormControl('');
  periodeCtrl = new UntypedFormControl(null);

  loading = false;
  periodes: Periode[] = [];
  affectations: Affectation[] = [];
  baremeDefaut = 20;

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

    this.periodeCtrl.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.page = 1;
        this.loadData();
      });
  }

  /**
   * Les périodes de l'année en cours (pour le filtre) et les affectations que
   * l'utilisateur peut noter (pour savoir s'il peut créer une évaluation).
   */
  private loadReferences(): void {
    this.anneeService.getList(1, 100).subscribe((annees) => {
      const active = annees.find((a) => a.en_cours) ?? annees[0];
      if (active) {
        this.periodeService.getByAnnee(active.id).subscribe((periodes) => {
          this.periodes = periodes;
        });
      }
    });

    this.evaluationService.getMesAffectations().subscribe((affectations) => {
      this.affectations = affectations;
    });

    this.evaluationService.getMeta().subscribe((meta) => {
      if (meta) this.baremeDefaut = meta.bareme_defaut;
    });
  }

  loadData(): void {
    this.loading = true;
    this.evaluationService
      .getList(
        this.page,
        this.perPage,
        (this.searchCtrl.value ?? '').trim(),
        this.periodeCtrl.value
      )
      .subscribe({
        next: () => (this.loading = false),
        error: () => {
          this.loading = false;
          this.notificationService.error(
            'Erreur lors du chargement des évaluations'
          );
        }
      });
  }

  onPageChange(event: PageEvent): void {
    this.page = event.pageIndex + 1;
    this.perPage = event.pageSize;
    this.loadData();
  }

  get canCreate(): boolean {
    return this.affectations.length > 0;
  }

  typeLabel(value: string): string {
    return TYPES_EVALUATION.find((t) => t.value === value)?.label ?? value;
  }

  matiereClasse(e: Evaluation): string {
    const matiere = e.affectation?.classe_matiere?.matiere?.nom ?? '—';
    const classe = e.affectation?.classe_matiere?.classe?.nom ?? '—';
    return `${matiere} · ${classe}`;
  }

  openAddDialog(): void {
    this.dialog
      .open(EvaluationDialogComponent, {
        width: '640px',
        disableClose: true,
        data: {
          isEdit: false,
          affectations: this.affectations,
          periodes: this.periodes,
          baremeDefaut: this.baremeDefaut
        }
      })
      .afterClosed()
      .subscribe((created) => {
        if (created) this.loadData();
      });
  }

  editEvaluation(evaluation: Evaluation): void {
    this.dialog
      .open(EvaluationDialogComponent, {
        width: '640px',
        disableClose: true,
        data: {
          isEdit: true,
          evaluation,
          affectations: this.affectations,
          periodes: this.periodes,
          baremeDefaut: this.baremeDefaut
        }
      })
      .afterClosed()
      .subscribe((updated) => {
        if (updated) this.loadData();
      });
  }

  /** Ouvre la grille de saisie des notes (l'évaluation transite par le state). */
  saisirNotes(evaluation: Evaluation): void {
    this.router.navigate(['/index/teacher/evaluations/notes'], {
      state: { evaluation }
    });
  }

  deleteEvaluation(evaluation: Evaluation): void {
    const data: ConfirmationDialogData = {
      title: "Supprimer l'évaluation",
      message: `Voulez-vous vraiment supprimer « ${evaluation.titre} » ? Les notes associées seront également supprimées. Cette action est irréversible.`,
      confirmLabel: 'Supprimer',
      destructive: true
    };

    this.dialog
      .open(ConfirmatiomModalComponent, { width: '440px', data })
      .afterClosed()
      .subscribe((confirmed) => {
        if (!confirmed) return;

        this.evaluationService.delete(evaluation.id).subscribe({
          next: (res) => {
            this.notificationService.success(res.message);
            if (this.evaluations().length === 1 && this.page > 1) this.page--;
            this.loadData();
          },
          error: (err) =>
            this.notificationService.error(
              err?.error?.message ?? 'Erreur lors de la suppression'
            )
        });
      });
  }
}
