import { CommonModule } from '@angular/common';
import { Component, DestroyRef, inject, OnInit } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  FormsModule,
  ReactiveFormsModule,
  UntypedFormControl
} from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatMenuModule } from '@angular/material/menu';
import { PageEvent } from '@angular/material/paginator';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';
import { debounceTime, distinctUntilChanged } from 'rxjs';
import { fadeInRight400ms } from '@vex/animations/fade-in-right.animation';
import { scaleIn400ms } from '@vex/animations/scale-in.animation';
import { stagger40ms } from '@vex/animations/stagger.animation';
import {
  ContratFiltres,
  ContratService
} from 'src/app/auth/services/contrat.service';
import { NotificationService } from 'src/app/auth/services/Notification.service';
import { Contrat, ContratMeta } from 'src/app/interfaces/Contrat';
import { PaginationMeta } from 'src/app/response-type/Type';
import { ListeLigneComponent } from 'src/app/shared/liste/liste-ligne.component';
import { ListePageComponent } from 'src/app/shared/liste/liste-page.component';
import { ContratDetailComponent } from '../contrat-detail/contrat-detail.component';
import { ContratResilierComponent } from '../contrat-resilier/contrat-resilier.component';
import { ContratRenouvelerComponent } from '../contrat-renouveler/contrat-renouveler.component';

/** Apparence d'un badge de statut ou de type. */
interface Badge {
  text: string;
  bgClass: string;
  textClass: string;
}

@Component({
  selector: 'vex-contrat-list',
  templateUrl: './contrat-list.component.html',
  animations: [scaleIn400ms, fadeInRight400ms, stagger40ms],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatInputModule,
    MatFormFieldModule,
    MatSelectModule,
    MatIconModule,
    MatButtonModule,
    MatMenuModule,
    MatTooltipModule,
    MatDialogModule,
    MatProgressSpinnerModule,
    ListePageComponent,
    ListeLigneComponent
  ]
})
export class ContratListComponent implements OnInit {
  private readonly destroyRef = inject(DestroyRef);
  private readonly contratService = inject(ContratService);
  private readonly notificationService = inject(NotificationService);
  private readonly dialog = inject(MatDialog);

  contrats: Contrat[] = [];
  searchCtrl = new UntypedFormControl('');
  loading = false;

  /** Le contrat dont le PDF se prépare, pour n'animer que sa ligne. */
  downloadingId: number | null = null;

  /** Référentiels servis par le back : évite de figer les libellés ici. */
  referentiels: ContratMeta | null = null;

  /** Nombre total côté serveur : la pagination n'est pas locale. */
  total = 0;
  pageIndex = 0;
  pageSize = 10;
  readonly pageSizeOptions = [10, 25, 50, 100];

  filtres: ContratFiltres = {};

  readonly typesPersonnel = [
    { value: 'App\\Models\\Enseignant', label: 'Enseignants' },
    { value: 'App\\Models\\Tresorier', label: 'Trésoriers' },
    { value: 'App\\Models\\Surveillant', label: 'Surveillants' }
  ];

  /** Les échéances proches, filtre le plus utile au quotidien. */
  readonly fenetresEcheance = [
    { value: 30, label: 'Sous 30 jours' },
    { value: 60, label: 'Sous 60 jours' },
    { value: 90, label: 'Sous 90 jours' }
  ];

  private readonly typeBadges: Record<string, Badge> = {
    permanent: { text: 'Permanent', bgClass: 'bg-green-100', textClass: 'text-green-700' },
    vacataire: { text: 'Vacataire', bgClass: 'bg-amber-100', textClass: 'text-amber-700' },
    stagiaire: { text: 'Stagiaire', bgClass: 'bg-blue-100',  textClass: 'text-blue-700' }
  };

  private readonly statutBadges: Record<string, Badge> = {
    ACTIF:     { text: 'Actif',     bgClass: 'bg-green-100', textClass: 'text-green-700' },
    SUSPENDU:  { text: 'Suspendu',  bgClass: 'bg-amber-100', textClass: 'text-amber-700' },
    EXPIRE:    { text: 'Expiré',    bgClass: 'bg-gray-200',  textClass: 'text-gray-700' },
    RESILIE:   { text: 'Résilié',   bgClass: 'bg-red-100',   textClass: 'text-red-700' },
    BROUILLON: { text: 'Brouillon', bgClass: 'bg-blue-100',  textClass: 'text-blue-700' }
  };

  get meta(): PaginationMeta {
    return {
      current_page: this.pageIndex + 1,
      per_page: this.pageSize,
      total: this.total,
      last_page: Math.max(1, Math.ceil(this.total / this.pageSize)),
      pageSizeOptions: this.pageSizeOptions
    };
  }

  /** Un bouton « Réinitialiser » n'a de sens que si un filtre est posé. */
  get aDesFiltres(): boolean {
    return Object.values(this.filtres).some(
      (v) => v !== undefined && v !== null && v !== ''
    );
  }

  ngOnInit(): void {
    this.contratService.getMeta().subscribe((meta) => (this.referentiels = meta));
    this.loadData();

    // La recherche part au serveur : sans délai, chaque frappe déclencherait
    // une requête.
    this.searchCtrl.valueChanges
      .pipe(debounceTime(350), distinctUntilChanged(), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.pageIndex = 0;
        this.loadData();
      });
  }

  loadData(): void {
    this.loading = true;

    this.contratService
      .getList(
        this.pageIndex + 1,
        this.pageSize,
        this.searchCtrl.value ?? '',
        this.filtres
      )
      .subscribe({
        next: (contrats) => {
          this.contrats = contrats;
          this.total = this.contratService.meta().total ?? contrats.length;
          this.loading = false;
        },
        error: () => {
          this.loading = false;
          this.notificationService.error('Erreur lors du chargement des contrats');
        }
      });
  }

  onPageChange(event: PageEvent): void {
    this.pageIndex = event.pageIndex;
    this.pageSize = event.pageSize;
    this.loadData();
  }

  /** Tout changement de filtre ramène à la première page. */
  appliquerFiltres(): void {
    this.pageIndex = 0;
    this.loadData();
  }

  reinitialiserFiltres(): void {
    this.filtres = {};
    this.searchCtrl.setValue('', { emitEvent: false });
    this.pageIndex = 0;
    this.loadData();
  }

  voirDetail(contrat: Contrat): void {
    this.dialog
      .open(ContratDetailComponent, {
        width: '760px',
        data: { contratId: contrat.id }
      })
      .afterClosed()
      .subscribe((modifie) => {
        if (modifie) this.loadData();
      });
  }

  resilier(contrat: Contrat): void {
    this.dialog
      .open(ContratResilierComponent, {
        width: '560px',
        disableClose: true,
        data: { contrat }
      })
      .afterClosed()
      .subscribe((resilie) => {
        if (resilie) this.loadData();
      });
  }

  renouveler(contrat: Contrat): void {
    this.dialog
      .open(ContratRenouvelerComponent, {
        width: '680px',
        disableClose: true,
        data: { contrat }
      })
      .afterClosed()
      .subscribe((renouvele) => {
        if (renouvele) this.loadData();
      });
  }

  /**
   * Télécharge le contrat de travail imprimable, QR de vérification inclus.
   *
   * L'identifiant en cours borne le spinner à la seule ligne concernée et
   * empêche d'empiler les demandes sur un clic répété.
   */
  telechargerPdf(contrat: Contrat): void {
    if (this.downloadingId !== null) return;
    this.downloadingId = contrat.id;

    this.contratService.downloadPdf(contrat.id).subscribe({
      next: (blob) => {
        this.downloadingId = null;
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `contrat-${contrat.numero_contrat}.pdf`;
        a.click();
        window.URL.revokeObjectURL(url);
      },
      error: () => {
        this.downloadingId = null;
        this.notificationService.error(
          'Erreur lors de la génération du contrat PDF'
        );
      }
    });
  }

  supprimer(contrat: Contrat): void {
    this.contratService.delete(contrat.id).subscribe({
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

  // ── Affichage ──

  employe(contrat: Contrat): string {
    const user = contrat.contractable?.user;
    const nom = `${user?.first_name ?? ''} ${user?.last_name ?? ''}`.trim();

    return nom || '—';
  }

  matricule(contrat: Contrat): string {
    return contrat.contractable?.matricule ?? '';
  }

  typeBadge(type: string | null): Badge {
    return (
      this.typeBadges[type ?? ''] ?? {
        text: type ?? '—',
        bgClass: 'bg-gray-100',
        textClass: 'text-gray-700'
      }
    );
  }

  statutBadge(statut: string | null): Badge {
    return (
      this.statutBadges[statut ?? ''] ?? {
        text: statut ?? '—',
        bgClass: 'bg-gray-100',
        textClass: 'text-gray-700'
      }
    );
  }

  /** « du 01/09/2026 au 30/06/2027 », ou « depuis le … » sans terme. */
  periode(contrat: Contrat): string {
    const debut = this.formaterDate(contrat.date_debut);

    return contrat.date_fin
      ? `${debut} → ${this.formaterDate(contrat.date_fin)}`
      : `depuis le ${debut}`;
  }

  /**
   * Ce qu'il reste à courir. Un contrat clos ou sans terme n'a rien à annoncer ;
   * un contrat dépassé est signalé comme tel plutôt qu'avec un nombre négatif.
   */
  echeance(contrat: Contrat): { texte: string; classe: string } {
    const jours = contrat.jours_avant_echeance;

    if (jours === null || jours === undefined) {
      return { texte: '—', classe: 'text-hint' };
    }

    if (jours < 0) {
      return { texte: 'Terme dépassé', classe: 'text-red-600 font-medium' };
    }

    if (jours === 0) {
      return { texte: "Se termine aujourd'hui", classe: 'text-red-600 font-medium' };
    }

    // En deçà de deux mois, le renouvellement doit être préparé : on le
    // signale visuellement plutôt que de noyer la date dans la masse.
    const classe =
      jours <= 60 ? 'text-amber-600 font-medium' : 'text-secondary';

    return { texte: `dans ${jours} jour${jours > 1 ? 's' : ''}`, classe };
  }

  /** Un contrat clos ne se résilie ni ne se modifie : seul le renouvellement reste. */
  estClos(contrat: Contrat): boolean {
    return contrat.statut === 'EXPIRE' || contrat.statut === 'RESILIE';
  }

  private formaterDate(date: string | null): string {
    if (!date) {
      return '—';
    }

    return new Date(date).toLocaleDateString('fr-FR');
  }
}
