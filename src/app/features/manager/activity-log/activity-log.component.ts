import {
  AfterViewInit,
  Component,
  DestroyRef,
  inject,
  Input,
  OnInit,
  ViewChild
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  FormsModule,
  ReactiveFormsModule,
  UntypedFormControl,
  UntypedFormGroup
} from '@angular/forms';
import { DatePipe, NgClass, NgFor, NgIf } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatMenuModule } from '@angular/material/menu';
import { MatPaginator, MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatTable, MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { fadeInUp400ms } from '@vex/animations/fade-in-up.animation';
import { stagger40ms } from '@vex/animations/stagger.animation';
import { VexPageLayoutComponent } from '@vex/components/vex-page-layout/vex-page-layout.component';
import { VexPageLayoutContentDirective } from '@vex/components/vex-page-layout/vex-page-layout-content.directive';
import { VexPageLayoutHeaderDirective } from '@vex/components/vex-page-layout/vex-page-layout-header.directive';
import { VexBreadcrumbsComponent } from '@vex/components/vex-breadcrumbs/vex-breadcrumbs.component';
import { TableColumn } from '@vex/interfaces/table-column.interface';
import { debounceTime, distinctUntilChanged } from 'rxjs';
import { ActivityLog } from 'src/app/interfaces/ActivityLog';
import {
  ActivityLogFilters,
  ActivityLogService
} from 'src/app/auth/services/activity-log.service';
import { NotificationService } from 'src/app/auth/services/Notification.service';
import { PaginationMeta, initialPaginationMeta } from 'src/app/response-type/Type';

/** Une différence entre l'état avant et après, prête à l'affichage. */
interface ActivityChange {
  label: string;
  before: string;
  after: string;
}

/**
 * Clés techniques exclues du comparatif : elles changent à chaque écriture
 * (horodatages) ou n'apportent rien à la lecture (pivots, clés étrangères).
 */
const IGNORED_KEYS = new Set([
  'id',
  'created_at',
  'updated_at',
  'deleted_at',
  'pivot',
  'password',
  'remember_token',
  'email_verified_at'
]);

/** Libellés lisibles pour les champs les plus courants. */
const FIELD_LABELS: Record<string, string> = {
  nom: 'Nom',
  nom_court: 'Nom court',
  code: 'Code',
  description: 'Description',
  first_name: 'Prénom',
  last_name: 'Nom',
  email: 'Email',
  phone_one: 'Téléphone principal',
  phone_two: 'Téléphone secondaire',
  address: 'Adresse',
  status: 'Statut',
  role: 'Rôle',
  role_id: 'Rôle',
  matricule: 'Matricule',
  matieres: 'Matières de spécialité',
  type_contrat: 'Type de contrat',
  date_embauche: "Date d'embauche",
  salaire_base: 'Rémunération',
  mode_remuneration: 'Mode de rémunération',
  diplomes: 'Diplômes',
  user: 'Utilisateur',
  coefficient: 'Coefficient',
  volume_horaire: 'Volume horaire',
  montant: 'Montant',
  libelle: 'Libellé',
  date_debut: 'Date de début',
  date_fin: 'Date de fin'
};

@Component({
  selector: 'vex-activity-log',
  templateUrl: './activity-log.component.html',
  styleUrls: ['./activity-log.component.scss'],
  animations: [fadeInUp400ms, stagger40ms],
  standalone: true,
  imports: [
    NgIf,
    NgFor,
    NgClass,
    DatePipe,
    FormsModule,
    ReactiveFormsModule,
    MatTableModule,
    MatSortModule,
    MatPaginatorModule,
    MatCheckboxModule,
    MatInputModule,
    MatIconModule,
    MatButtonModule,
    MatMenuModule,
    MatTooltipModule,
    MatProgressSpinnerModule,
    MatFormFieldModule,
    MatSelectModule,
    MatDatepickerModule,
    MatNativeDateModule,
    VexPageLayoutComponent,
    VexPageLayoutHeaderDirective,
    VexPageLayoutContentDirective,
    VexBreadcrumbsComponent
  ]
})
export class ActivityLogComponent implements OnInit, AfterViewInit {
  private readonly destroyRef          = inject(DestroyRef);
  private readonly activityLogService  = inject(ActivityLogService);
  private readonly notificationService = inject(NotificationService);

  @Input() columns: TableColumn<ActivityLog>[] = [
    { label: 'Date',        property: 'created_at',  type: 'text',   visible: true,  cssClasses: ['text-secondary', 'text-sm'] },
    { label: 'Utilisateur', property: 'user',         type: 'text',   visible: true,  cssClasses: ['font-medium'] },
    { label: 'Action',      property: 'action',       type: 'badge',  visible: true  },
    { label: 'Module',      property: 'module',       type: 'badge',  visible: true  },
    { label: 'Description', property: 'description',  type: 'text',   visible: true  },
    { label: 'IP',          property: 'ip_address',   type: 'text',   visible: false, cssClasses: ['text-secondary', 'text-sm'] },
    { label: 'Actions',     property: 'actions',      type: 'button', visible: true  }
  ];

  // static: false — le tableau (et donc matSort) vit derrière *ngIf="!loading".
  // Avec static: true la requête était résolue avant la détection de changement,
  // alors que le *ngIf était encore faux : sort restait undefined.
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort?: MatSort;
  /** Nécessaire pour forcer la réévaluation des row defs (ligne de détail). */
  @ViewChild(MatTable) table?: MatTable<ActivityLog>;

  dataSource = new MatTableDataSource<ActivityLog>([]);
  searchCtrl = new UntypedFormControl('');
  loading    = false;
  expanded: number | null = null;

  /**
   * Diffs déjà calculés, par id de log. changesFor() est appelée depuis le
   * template, donc à chaque cycle de détection : sans mémoïsation, le
   * comparatif serait reconstruit en continu (et *ngIf verrait une nouvelle
   * référence de tableau à chaque passe).
   */
  private readonly changesCache = new Map<number, ActivityChange[]>();

  meta: PaginationMeta = { ...initialPaginationMeta, per_page: 20 };

  filterForm = new UntypedFormGroup({
    action:    new UntypedFormControl(''),
    module:    new UntypedFormControl(''),
    date_from: new UntypedFormControl(''),
    date_to:   new UntypedFormControl('')
  });

  readonly actionBadge: Record<string, { text: string; bgClass: string; textClass: string }> = {
    created:  { text: 'Création',     bgClass: 'bg-green-100',  textClass: 'text-green-700'  },
    updated:  { text: 'Modification', bgClass: 'bg-blue-100',   textClass: 'text-blue-700'   },
    deleted:  { text: 'Suppression',  bgClass: 'bg-red-100',    textClass: 'text-red-700'    },
    restored: { text: 'Restauration', bgClass: 'bg-amber-100',  textClass: 'text-amber-700'  },
    login:    { text: 'Connexion',    bgClass: 'bg-purple-100', textClass: 'text-purple-700' },
    logout:   { text: 'Déconnexion',  bgClass: 'bg-gray-100',   textClass: 'text-gray-600'   }
  };

  readonly moduleBadge: Record<string, { text: string; bgClass: string; textClass: string }> = {
    users:            { text: 'Utilisateurs',    bgClass: 'bg-indigo-100', textClass: 'text-indigo-700' },
    enseignants:      { text: 'Enseignants',      bgClass: 'bg-teal-100',   textClass: 'text-teal-700'   },
    surveillants:     { text: 'Surveillants',     bgClass: 'bg-cyan-100',   textClass: 'text-cyan-700'   },
    tresoriers:       { text: 'Trésoriers',       bgClass: 'bg-orange-100', textClass: 'text-orange-700' },
    'annees-scolaires': { text: 'Années scolaires', bgClass: 'bg-pink-100', textClass: 'text-pink-700'   },
    niveaux:          { text: 'Niveaux',          bgClass: 'bg-lime-100',   textClass: 'text-lime-700'   },
    periodes:         { text: 'Périodes',         bgClass: 'bg-violet-100', textClass: 'text-violet-700' }
  };

  readonly actionOptions = [
    { value: '',         label: 'Toutes les actions' },
    { value: 'created',  label: 'Création'     },
    { value: 'updated',  label: 'Modification' },
    { value: 'deleted',  label: 'Suppression'  },
    { value: 'restored', label: 'Restauration' },
    { value: 'login',    label: 'Connexion'    },
    { value: 'logout',   label: 'Déconnexion'  }
  ];

  readonly moduleOptions = [
    { value: '',                 label: 'Tous les modules'   },
    { value: 'users',            label: 'Utilisateurs'       },
    { value: 'enseignants',      label: 'Enseignants'        },
    { value: 'surveillants',     label: 'Surveillants'       },
    { value: 'tresoriers',       label: 'Trésoriers'         },
    { value: 'annees-scolaires', label: 'Années scolaires'   },
    { value: 'niveaux',          label: 'Niveaux'            },
    { value: 'periodes',         label: 'Périodes'           }
  ];

  get visibleColumns(): string[] {
    return this.columns.filter((c) => c.visible).map((c) => c.property);
  }

  ngOnInit(): void {
    this.loadData();

    this.searchCtrl.valueChanges
      .pipe(debounceTime(350), distinctUntilChanged(), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.reload());

    this.filterForm.valueChanges
      .pipe(debounceTime(350), distinctUntilChanged(), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.reload());
  }

  ngAfterViewInit(): void {
    // Le tableau n'existe qu'une fois le chargement terminé : matSort peut
    // encore être absent à ce stade, loadData() rebranchera le tri.
    this.attachSort();
  }

  /** Rattache matSort au dataSource dès que le tableau est présent. */
  private attachSort(): void {
    if (this.sort && this.dataSource.sort !== this.sort) {
      this.dataSource.sort = this.sort;
    }
  }

  loadData(page = 1): void {
    this.loading = true;
    const f = this.filterForm.value;

    const filters: ActivityLogFilters = {
      search:    this.searchCtrl.value?.trim() || undefined,
      action:    f.action  || undefined,
      module:    f.module  || undefined,
      date_from: f.date_from ? this.formatDate(f.date_from) : undefined,
      date_to:   f.date_to   ? this.formatDate(f.date_to)   : undefined
    };

    this.activityLogService.getList(page, this.meta.per_page, filters).subscribe({
      next: (data) => {
        // Les diffs mémoïsés portent sur l'ancien jeu de données.
        this.changesCache.clear();
        this.expanded = null;
        this.dataSource.data = data;
        this.meta = { ...this.activityLogService.meta() };
        this.loading = false;

        // Le *ngIf vient de rendre le tableau : matSort est enfin disponible.
        queueMicrotask(() => this.attachSort());
      },
      error: () => {
        this.loading = false;
        this.notificationService.error('Erreur lors du chargement du journal d\'activité');
      }
    });
  }

  reload(): void {
    this.loadData(1);
  }

  onPageChange(event: PageEvent): void {
    this.meta.per_page = event.pageSize;
    this.loadData(event.pageIndex + 1);
  }

  toggleExpand(id: number): void {
    this.expanded = this.expanded === id ? null : id;

    // Material met en cache les row defs retenues pour chaque ligne : changer
    // `expanded` ne suffit pas, le prédicat `when` n'est réévalué que sur un
    // rendu explicite. Sans cet appel, la ligne de détail n'apparaît jamais.
    this.table?.renderRows();
  }

  /** Arrow property: Material calls the predicate unbound. */
  readonly isExpanded = (_index: number, row: ActivityLog): boolean =>
    this.expanded === row.id;

  resetFilters(): void {
    this.searchCtrl.setValue('', { emitEvent: false });
    this.filterForm.reset({ action: '', module: '', date_from: '', date_to: '' }, { emitEvent: false });
    this.loadData(1);
  }

  toggleColumn(column: TableColumn<ActivityLog>, event: Event): void {
    event.stopPropagation();
    event.stopImmediatePropagation();
    column.visible = !column.visible;
  }

  trackByProperty<T>(_index: number, column: TableColumn<T>): string {
    return column.property;
  }

  trackById(_index: number, log: ActivityLog): number {
    return log.id;
  }

  actionBadgeFor(action: string) {
    return this.actionBadge[action] ?? { text: action, bgClass: 'bg-gray-100', textClass: 'text-gray-600' };
  }

  moduleBadgeFor(module: string) {
    return this.moduleBadge[module] ?? { text: module, bgClass: 'bg-gray-100', textClass: 'text-gray-600' };
  }

  userName(log: ActivityLog): string {
    if (!log.user) return '—';
    return `${log.user.first_name} ${log.user.last_name}`;
  }

  /**
   * Champs réellement modifiés entre old_values et new_values.
   *
   * Les valeurs enregistrées sont des `toArray()` complets (relations, pivots,
   * horodatages inclus) : afficher les deux JSON bruts noyait l'information.
   * On ne garde donc que les clés dont la valeur a changé.
   *
   * Pour une création ou une suppression, un seul des deux états existe : on
   * liste alors les champs renseignés.
   */
  changesFor(log: ActivityLog): ActivityChange[] {
    const cacheKey = log.id;
    const cached = this.changesCache.get(cacheKey);
    if (cached) return cached;

    const before = (log.old_values ?? {}) as Record<string, unknown>;
    const after = (log.new_values ?? {}) as Record<string, unknown>;

    const cles = new Set([...Object.keys(before), ...Object.keys(after)]);
    const changes: ActivityChange[] = [];

    for (const cle of cles) {
      if (IGNORED_KEYS.has(cle)) continue;

      const avant = this.formatValue(before[cle]);
      const apres = this.formatValue(after[cle]);

      if (avant === apres) continue;

      changes.push({
        label: FIELD_LABELS[cle] ?? cle.replace(/_/g, ' '),
        before: avant,
        after: apres
      });
    }

    changes.sort((a, b) => a.label.localeCompare(b.label));
    this.changesCache.set(cacheKey, changes);

    return changes;
  }

  /** Rend une valeur lisible : relations, listes et booléens compris. */
  private formatValue(value: unknown): string {
    if (value === null || value === undefined || value === '') return '—';
    if (typeof value === 'boolean') return value ? 'Oui' : 'Non';

    if (Array.isArray(value)) {
      if (!value.length) return '—';
      return value.map((v) => this.formatValue(v)).join(', ');
    }

    if (typeof value === 'object') {
      const objet = value as Record<string, unknown>;
      // Une relation est plus parlante par son libellé que par son id.
      for (const cle of ['nom', 'name', 'full_name', 'libelle', 'code']) {
        if (typeof objet[cle] === 'string') return objet[cle] as string;
      }
      return JSON.stringify(value);
    }

    return String(value);
  }

  private formatDate(val: string | Date): string {
    const d = new Date(val);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }
}
