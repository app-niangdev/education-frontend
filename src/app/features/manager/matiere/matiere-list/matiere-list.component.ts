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
import { fadeInRight400ms } from '@vex/animations/fade-in-right.animation';
import { scaleIn400ms } from '@vex/animations/scale-in.animation';
import { stagger40ms } from '@vex/animations/stagger.animation';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { MatiereService } from 'src/app/auth/services/matiere.service';
import { NotificationService } from 'src/app/auth/services/Notification.service';
import {
  ConfirmationDialogData,
  ConfirmatiomModalComponent
} from 'src/app/features/confirmatiom-modal/confirmatiom-modal.component';
import { Matiere } from 'src/app/interfaces/Matiere';
import { ListeLigneComponent } from 'src/app/shared/liste/liste-ligne.component';
import { ListePageComponent } from 'src/app/shared/liste/liste-page.component';
import { MatiereAddUpdateComponent } from '../matiere-add-update/matiere-add-update.component';

@Component({
  selector: 'vex-matiere-list',
  templateUrl: './matiere-list.component.html',
  styleUrls: ['./matiere-list.component.scss'],
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
export class MatiereListComponent implements OnInit {
  private readonly destroyRef = inject(DestroyRef);
  private readonly matiereService = inject(MatiereService);
  private readonly notificationService = inject(NotificationService);
  private readonly dialog = inject(MatDialog);

  readonly matieres = this.matiereService.matieres;
  readonly meta = this.matiereService.meta;

  searchCtrl = new UntypedFormControl('');
  loading = false;

  page = 1;
  perPage = 10;

  ngOnInit(): void {
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
  }

  loadData(): void {
    this.loading = true;
    this.matiereService
      .getList(this.page, this.perPage, (this.searchCtrl.value ?? '').trim())
      .subscribe({
        next: () => (this.loading = false),
        error: () => {
          this.loading = false;
          this.notificationService.error(
            'Erreur lors du chargement des matières'
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
      .open(MatiereAddUpdateComponent, {
        width: '600px',
        disableClose: true,
        data: { isEdit: false }
      })
      .afterClosed()
      .subscribe((created) => {
        if (created) this.loadData();
      });
  }

  editMatiere(matiere: Matiere): void {
    this.dialog
      .open(MatiereAddUpdateComponent, {
        width: '600px',
        disableClose: true,
        data: { isEdit: true, matiere }
      })
      .afterClosed()
      .subscribe((updated) => {
        if (updated) this.loadData();
      });
  }

  deleteMatiere(matiere: Matiere): void {
    const data: ConfirmationDialogData = {
      title: 'Supprimer la matière',
      message: `Voulez-vous vraiment supprimer la matière « ${matiere.nom} » ? Cette action est irréversible.`,
      confirmLabel: 'Supprimer',
      destructive: true
    };

    this.dialog
      .open(ConfirmatiomModalComponent, { width: '440px', data })
      .afterClosed()
      .subscribe((confirmed) => {
        if (!confirmed) return;

        this.matiereService.delete(matiere.id).subscribe({
          next: (res) => {
            this.notificationService.success(res.message);
            // Supprimer le dernier element d'une page la viderait : on recule.
            if (this.matieres().length === 1 && this.page > 1) this.page--;
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
