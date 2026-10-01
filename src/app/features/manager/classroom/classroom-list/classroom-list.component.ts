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
import { MatTooltipModule } from '@angular/material/tooltip';
import { Router } from '@angular/router';
import { fadeInRight400ms } from '@vex/animations/fade-in-right.animation';
import { scaleIn400ms } from '@vex/animations/scale-in.animation';
import { stagger40ms } from '@vex/animations/stagger.animation';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { ClasseService } from 'src/app/auth/services/classe.service';
import { NotificationService } from 'src/app/auth/services/Notification.service';
import { AuthService } from 'src/app/auth/services/auth.service';
import {
  ConfirmationDialogData,
  ConfirmatiomModalComponent
} from 'src/app/features/confirmatiom-modal/confirmatiom-modal.component';
import { Classe } from 'src/app/interfaces/Classe';
import { ListeLigneComponent } from 'src/app/shared/liste/liste-ligne.component';
import { ListePageComponent } from 'src/app/shared/liste/liste-page.component';
import { ClassroomAddUpdateComponent } from '../classroom-add-update/classroom-add-update.component';
import {
  ROUTE_CLASSE_EMPLOI_DU_TEMPS,
  ROUTE_CLASSE_PROGRAMME,
  STATE_CLASSE
} from '../classe-navigation';

@Component({
  selector: 'vex-classroom-list',
  templateUrl: './classroom-list.component.html',
  styleUrls: ['./classroom-list.component.scss'],
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
    MatDialogModule,
    ListePageComponent,
    ListeLigneComponent
  ]
})
export class ClassroomListComponent implements OnInit {
  private readonly destroyRef = inject(DestroyRef);
  private readonly classeService = inject(ClasseService);
  private readonly notificationService = inject(NotificationService);
  private readonly dialog = inject(MatDialog);
  private readonly router = inject(Router);
  private readonly authService = inject(AuthService);

  /**
   * Ecran mutualise manager/surveillant. Le surveillant est en lecture seule
   * sur les classes : creation, modification et suppression lui sont masquees.
   */
  readonly isSupervisor = this.authService.isSupervisor();

  readonly classes = this.classeService.classes;
  readonly meta = this.classeService.meta;

  searchCtrl = new UntypedFormControl('');
  loading = false;

  page = 1;
  perPage = 10;

  ngOnInit(): void {
    this.loadData();

    // La recherche est faite cote serveur : on debounce pour ne pas
    // declencher une requete a chaque frappe.
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
  }

  loadData(): void {
    this.loading = true;
    this.classeService
      .getList(this.page, this.perPage, (this.searchCtrl.value ?? '').trim())
      .subscribe({
        next: () => (this.loading = false),
        error: () => {
          this.loading = false;
          this.notificationService.error(
            'Erreur lors du chargement des classes'
          );
        }
      });
  }

  onPageChange(event: PageEvent): void {
    this.page = event.pageIndex + 1;
    this.perPage = event.pageSize;
    this.loadData();
  }

  openAddDialog(): void {
    this.dialog
      .open(ClassroomAddUpdateComponent, {
        width: '600px',
        disableClose: true,
        data: { isEdit: false }
      })
      .afterClosed()
      .subscribe((created) => {
        if (created) this.loadData();
      });
  }

  editClasse(classe: Classe): void {
    this.dialog
      .open(ClassroomAddUpdateComponent, {
        width: '600px',
        disableClose: true,
        data: { isEdit: true, classe }
      })
      .afterClosed()
      .subscribe((updated) => {
        if (updated) this.loadData();
      });
  }

  deleteClasse(classe: Classe): void {
    const data: ConfirmationDialogData = {
      title: 'Supprimer la classe',
      message: `Voulez-vous vraiment supprimer la classe « ${classe.nom} » ? Cette action est irréversible.`,
      confirmLabel: 'Supprimer',
      destructive: true
    };

    this.dialog
      .open(ConfirmatiomModalComponent, { width: '440px', data })
      .afterClosed()
      .subscribe((confirmed) => {
        if (!confirmed) return;

        this.classeService.delete(classe.id).subscribe({
          next: (res) => {
            this.notificationService.success(res.message);
            // Supprimer le dernier element d'une page la viderait : on recule.
            if (this.classes().length === 1 && this.page > 1) this.page--;
            this.loadData();
          },
          error: (err) =>
            this.notificationService.error(
              err?.error?.message ?? 'Erreur lors de la suppression'
            )
        });
      });
  }

  /** Ouvre le programme de la classe (matieres, coefficients, enseignants). */
  openProgramme(classe: Classe): void {
    this.router.navigate([ROUTE_CLASSE_PROGRAMME(this.router)], {
      state: { [STATE_CLASSE]: classe }
    });
  }

  /** Ouvre l'emploi du temps de la classe. */
  openEmploiDuTemps(classe: Classe): void {
    this.router.navigate([ROUTE_CLASSE_EMPLOI_DU_TEMPS(this.router)], {
      state: { [STATE_CLASSE]: classe }
    });
  }

  effectifLabel(classe: Classe): string {
    const inscrits = classe.inscriptions_count ?? 0;
    return classe.effectif_max
      ? `${inscrits} / ${classe.effectif_max}`
      : `${inscrits}`;
  }

  /** Rouge des que la classe atteint son effectif maximum. */
  effectifClass(classe: Classe): string {
    if (!classe.effectif_max) return 'text-hint';
    const inscrits = classe.inscriptions_count ?? 0;
    if (inscrits >= classe.effectif_max) return 'text-red-600 font-semibold';
    if (inscrits >= classe.effectif_max * 0.9) return 'text-amber-600';
    return 'text-hint';
  }

  /** Couleur du badge d'effectif (fond + texte) selon le taux de remplissage. */
  effectifBadgeClass(classe: Classe): string {
    if (!classe.effectif_max) return 'bg-gray-100 text-gray-600';
    const inscrits = classe.inscriptions_count ?? 0;
    if (inscrits >= classe.effectif_max) return 'bg-red-100 text-red-700';
    if (inscrits >= classe.effectif_max * 0.9) return 'bg-amber-100 text-amber-700';
    return 'bg-green-100 text-green-700';
  }
}
