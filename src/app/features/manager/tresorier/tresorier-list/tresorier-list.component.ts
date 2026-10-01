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
import { PageEvent } from '@angular/material/paginator';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { fadeInRight400ms } from '@vex/animations/fade-in-right.animation';
import { scaleIn400ms } from '@vex/animations/scale-in.animation';
import { stagger40ms } from '@vex/animations/stagger.animation';
import { NotificationService } from 'src/app/auth/services/Notification.service';
import { TresorierService } from 'src/app/auth/services/tresorier.service';
import { UserService } from 'src/app/auth/services/user.service';
import {
  ConfirmationDialogData,
  ConfirmatiomModalComponent
} from 'src/app/features/confirmatiom-modal/confirmatiom-modal.component';
import { Tresorier } from 'src/app/interfaces/Tresorier';
import { PaginationMeta } from 'src/app/response-type/Type';
import { ListeLigneComponent } from 'src/app/shared/liste/liste-ligne.component';
import { ListePageComponent } from 'src/app/shared/liste/liste-page.component';
import { TresorierAddUpdateComponent } from '../tresorier-add-update/tresorier-add-update.component';

@Component({
  selector: 'vex-tresorier-list',
  templateUrl: './tresorier-list.component.html',
  styleUrls: ['./tresorier-list.component.scss'],
  animations: [scaleIn400ms, fadeInRight400ms, stagger40ms],
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
    MatDialogModule,
    ListePageComponent,
    ListeLigneComponent
  ]
})
export class TresorierListComponent implements OnInit {
  private readonly destroyRef = inject(DestroyRef);
  private readonly tresorierService = inject(TresorierService);
  private readonly notificationService = inject(NotificationService);
  private readonly userService = inject(UserService);
  private readonly dialog = inject(MatDialog);

  /** Tous les trésoriers chargés ; la recherche et la pagination sont client. */
  private tous: Tresorier[] = [];
  tresoriers: Tresorier[] = [];

  searchCtrl = new UntypedFormControl('');
  loading = false;

  /** Id du trésorier dont les accès sont en cours de réinitialisation. */
  reinitialisationEnCours: number | null = null;

  page = 0;
  perPage = 10;
  total = 0;
  readonly pageSizeOptions = [10, 25, 50, 100];

  readonly contratBadge: Record<
    string,
    { text: string; bgClass: string; textClass: string }
  > = {
    permanent: { text: 'Permanent', bgClass: 'bg-green-100', textClass: 'text-green-700' },
    vacataire: { text: 'Vacataire', bgClass: 'bg-amber-100', textClass: 'text-amber-700' },
    stagiaire: { text: 'Stagiaire', bgClass: 'bg-blue-100', textClass: 'text-blue-700' }
  };

  get meta(): PaginationMeta {
    return {
      current_page: this.page + 1,
      per_page: this.perPage,
      total: this.total,
      last_page: Math.max(1, Math.ceil(this.total / this.perPage)),
      pageSizeOptions: this.pageSizeOptions
    };
  }

  ngOnInit(): void {
    this.loadData();

    this.searchCtrl.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.page = 0;
        this.rafraichir();
      });
  }

  loadData(): void {
    this.loading = true;
    this.tresorierService.getAll().subscribe({
      next: (tresoriers) => {
        this.tous = tresoriers;
        this.page = 0;
        this.rafraichir();
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this.notificationService.error('Erreur lors du chargement des trésoriers');
      }
    });
  }

  /** Applique recherche + pagination côté client. */
  private rafraichir(): void {
    const q = (this.searchCtrl.value ?? '').trim().toLowerCase();
    const filtres = q ? this.tous.filter((t) => this.correspond(t, q)) : this.tous;
    this.total = filtres.length;
    const debut = this.page * this.perPage;
    this.tresoriers = filtres.slice(debut, debut + this.perPage);
  }

  private correspond(t: Tresorier, q: string): boolean {
    return [
      t.user?.first_name,
      t.user?.last_name,
      t.user?.phone_one,
      t.user?.email,
      t.matricule,
      t.banque,
      t.numero_compte_bancaire,
      t.type_contrat
    ]
      .join(' ')
      .toLowerCase()
      .includes(q);
  }

  onPageChange(event: PageEvent): void {
    this.page = event.pageIndex;
    this.perPage = event.pageSize;
    this.rafraichir();
  }

  openAddDialog(): void {
    this.dialog
      .open(TresorierAddUpdateComponent, {
        width: '680px',
        disableClose: true,
        data: { isEdit: false }
      })
      .afterClosed()
      .subscribe((created) => {
        if (created) this.loadData();
      });
  }

  editTresorier(tresorier: Tresorier): void {
    this.dialog
      .open(TresorierAddUpdateComponent, {
        width: '680px',
        disableClose: true,
        data: { isEdit: true, tresorier }
      })
      .afterClosed()
      .subscribe((updated) => {
        if (updated) this.loadData();
      });
  }

  deleteTresorier(tresorier: Tresorier): void {
    this.tresorierService.delete(tresorier.id).subscribe({
      next: (res) => {
        this.notificationService.success(res.message);
        this.loadData();
      },
      error: (err) =>
        this.notificationService.error(
          err?.error?.message ?? 'Erreur lors de la suppression'
        )
    });
  }

  /**
   * Réinitialise les accès du trésorier. Le mot de passe n'est pas changé
   * ici : l'intéressé reçoit un lien et choisit lui-même le sien.
   */
  reinitialiserAcces(tresorier: Tresorier): void {
    const email = tresorier.user?.email;
    if (!tresorier.user_id || !email) {
      this.notificationService.error(
        "Ce trésorier n'a pas d'adresse e-mail : impossible de lui envoyer un lien."
      );
      return;
    }

    this.dialog
      .open(ConfirmatiomModalComponent, {
        width: '420px',
        data: {
          title: 'Réinitialiser les accès',
          message:
            `Un lien de réinitialisation sera envoyé à ${email}. ` +
            `${this.fullName(tresorier)} choisira lui-même son nouveau mot de passe ; ` +
            `son accès actuel reste valable tant qu'il ne l'a pas fait.`,
          confirmLabel: 'Envoyer le lien'
        } satisfies ConfirmationDialogData
      })
      .afterClosed()
      .subscribe((confirme) => {
        if (!confirme) return;

        this.reinitialisationEnCours = tresorier.id;
        this.userService.reinitialiserAcces(tresorier.user_id!).subscribe({
          next: (res) => {
            this.reinitialisationEnCours = null;
            this.notificationService.success(res.message);
          },
          error: (err) => {
            this.reinitialisationEnCours = null;
            this.notificationService.error(
              err?.error?.message ?? 'Erreur lors de la réinitialisation des accès'
            );
          }
        });
      });
  }

  fullName(t: Tresorier): string {
    return t.user ? `${t.user.first_name} ${t.user.last_name}` : '—';
  }

  contratBadgeFor(type: string | null | undefined) {
    return (
      this.contratBadge[type ?? ''] ?? {
        text: type ?? '—',
        bgClass: 'bg-gray-100',
        textClass: 'text-gray-700'
      }
    );
  }

  accesCaisseBadge(acces: boolean) {
    return acces
      ? { text: 'Caisse : oui', bgClass: 'bg-green-100', textClass: 'text-green-700' }
      : { text: 'Caisse : non', bgClass: 'bg-red-100', textClass: 'text-red-700' };
  }
}
