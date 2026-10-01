import { CommonModule } from '@angular/common';
import { Component, DestroyRef, inject, OnInit } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ReactiveFormsModule, UntypedFormControl } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { PageEvent } from '@angular/material/paginator';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ListeLigneComponent } from 'src/app/shared/liste/liste-ligne.component';
import { ListePageComponent } from 'src/app/shared/liste/liste-page.component';
import { fadeInRight400ms } from '@vex/animations/fade-in-right.animation';
import { scaleIn400ms } from '@vex/animations/scale-in.animation';
import { stagger40ms } from '@vex/animations/stagger.animation';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { AuthService } from 'src/app/auth/services/auth.service';
import { FinanceTresorierService } from 'src/app/auth/services/finance-tresorier.service';
import { NotificationService } from 'src/app/auth/services/Notification.service';
import { Inscription } from 'src/app/interfaces/Inscription';
import { ValiderInscriptionDialogComponent } from './valider-inscription-dialog/valider-inscription-dialog.component';

@Component({
  selector: 'vex-encaissements',
  templateUrl: './encaissements.component.html',
  animations: [stagger40ms, scaleIn400ms, fadeInRight400ms],
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatIconModule,
    MatButtonModule,
    MatTooltipModule,
    MatProgressSpinnerModule,
    MatFormFieldModule,
    MatInputModule,
    MatDialogModule,
    ListePageComponent,
    ListeLigneComponent
  ]
})
export class EncaissementsComponent implements OnInit {
  private readonly destroyRef = inject(DestroyRef);
  private readonly financeService = inject(FinanceTresorierService);
  private readonly notificationService = inject(NotificationService);
  private readonly dialog = inject(MatDialog);
  private readonly authService = inject(AuthService);

  readonly inscriptions = this.financeService.aEncaisser;
  readonly meta = this.financeService.aEncaisserMeta;

  /** Sans droit de caisse, la consultation reste ouverte mais pas l'encaissement. */
  readonly accesCaisse = this.authService.hasAccesCaisse();

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

    this.financeService
      .getAEncaisser(this.page, this.perPage, (this.searchCtrl.value ?? '').trim())
      .subscribe({
        next: () => (this.loading = false),
        error: () => {
          this.loading = false;
          this.notificationService.error(
            'Erreur lors du chargement des inscriptions à encaisser'
          );
        }
      });
  }

  onPageChange(event: PageEvent): void {
    this.page = event.pageIndex + 1;
    this.perPage = event.pageSize;
    this.loadData();
  }

  valider(inscription: Inscription): void {
    if (!this.accesCaisse) return;

    this.dialog
      .open(ValiderInscriptionDialogComponent, {
        width: '640px',
        maxHeight: '90vh',
        disableClose: true,
        data: { inscription }
      })
      .afterClosed()
      .subscribe((valide) => {
        if (!valide) return;

        // Solder l'inscription la retire de la liste : reculer d'une page si
        // c'etait le dernier element affiche.
        if (this.inscriptions().length === 1 && this.page > 1) this.page--;
        this.loadData();
      });
  }

  /** Une inscription EN_ATTENTE n'a encore recu aucun versement. */
  estEnAttente(i: Inscription): boolean {
    return i.statut_inscription === 'EN_ATTENTE';
  }

  statutPaiementLabel(i: Inscription): string {
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

  statutPaiementClass(i: Inscription): string {
    switch (i.statut_paiement) {
      case 'PARTIEL':
        return 'bg-amber-100 text-amber-800';
      case 'PAYE':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  }
}
