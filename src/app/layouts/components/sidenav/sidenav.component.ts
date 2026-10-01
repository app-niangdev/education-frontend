import { Component, inject, Input, OnInit } from '@angular/core';
import { NavigationService } from '../../../core/navigation/navigation.service';
import { VexLayoutService } from '@vex/services/vex-layout.service';
import { VexConfigService } from '@vex/config/vex-config.service';
import { map, startWith, switchMap } from 'rxjs/operators';
import { NavigationItem } from '../../../core/navigation/navigation-item.interface';
import { VexPopoverService } from '@vex/components/vex-popover/vex-popover.service';
import { BehaviorSubject, combineLatest, Observable, of } from 'rxjs';
import { toObservable } from '@angular/core/rxjs-interop';
import { SidenavUserMenuComponent } from './sidenav-user-menu/sidenav-user-menu.component';
import { MatDialog } from '@angular/material/dialog';
import { SearchModalComponent } from './search-modal/search-modal.component';
import { SidenavItemComponent } from './sidenav-item/sidenav-item.component';
import { VexScrollbarComponent } from '@vex/components/vex-scrollbar/vex-scrollbar.component';
import { MatRippleModule } from '@angular/material/core';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { AsyncPipe, NgFor, NgIf } from '@angular/common';
import { AuthService } from 'src/app/auth/services/auth.service';
import { UserFromToken } from 'src/app/interfaces/Auth';
import { EtablissementService } from 'src/app/auth/services/etablissement.service';

@Component({
  selector: 'vex-sidenav',
  templateUrl: './sidenav.component.html',
  styleUrls: ['./sidenav.component.scss'],
  standalone: true,
  imports: [
    NgIf,
    MatButtonModule,
    MatIconModule,
    MatRippleModule,
    VexScrollbarComponent,
    NgFor,
    SidenavItemComponent,
    AsyncPipe
  ]
})
export class SidenavComponent implements OnInit {
  @Input() collapsed: boolean = false;
  collapsedOpen$ = this.layoutService.sidenavCollapsedOpen$;

  private titleSubject$ = new BehaviorSubject<string>('');
  title$: Observable<string> = this.titleSubject$.asObservable();

  private imageUrlSubject$ = new BehaviorSubject<string>('');
  imageUrl$: Observable<string> = this.imageUrlSubject$.asObservable();

  showCollapsePin$ = this.configService.config$.pipe(
    map((config) => config.sidenav.showCollapsePin)
  );
  userVisible$ = this.configService.config$.pipe(
    map((config) => config.sidenav.user.visible)
  );
  searchVisible$ = this.configService.config$.pipe(
    map((config) => config.sidenav.search.visible)
  );

  userMenuOpen$: Observable<boolean> = of(false);

  items$: Observable<NavigationItem[]> = this.navigationService.items$;
  userConnect$: Observable<UserFromToken | null>;
  private readonly etablissementService = inject(EtablissementService);
  readonly etablissement = this.etablissementService.etablissement;
  private readonly etablissement$ = toObservable(this.etablissement);

  constructor(
    private navigationService: NavigationService,
    private layoutService: VexLayoutService,
    private configService: VexConfigService,
    private readonly popoverService: VexPopoverService,
    private readonly dialog: MatDialog,
    private readonly authService: AuthService
  ) {
    this.userConnect$ = this.authService.user$;
  }

  ngOnInit() {
    this.etablissementService.getInfoEtablissement().subscribe();

    combineLatest([
      this.configService.config$.pipe(
        map((config) => ({
          title: config.sidenav.title,
          imageUrl: config.sidenav.imageUrl
        }))
      ),
      this.etablissement$
    ]).subscribe(([{ title, imageUrl }, etab]) => {
      this.titleSubject$.next(etab?.nom_court ?? title);
      this.imageUrlSubject$.next(etab?.logo ?? imageUrl);
    });
  }

  collapseOpenSidenav() {
    this.layoutService.collapseOpenSidenav();
  }

  collapseCloseSidenav() {
    this.layoutService.collapseCloseSidenav();
  }

  toggleCollapse() {
    this.collapsed
      ? this.layoutService.expandSidenav()
      : this.layoutService.collapseSidenav();
  }

  trackByRoute(index: number, item: NavigationItem): string {
    if (item.type === 'link') {
      return item.route;
    }

    return item.label;
  }

  openProfileMenu(origin: HTMLDivElement): void {
    this.userMenuOpen$ = of(
      this.popoverService.open({
        content: SidenavUserMenuComponent,
        origin,
        offsetY: -8,
        width: origin.clientWidth,
        position: [
          {
            originX: 'center',
            originY: 'top',
            overlayX: 'center',
            overlayY: 'bottom'
          }
        ]
      })
    ).pipe(
      switchMap((popoverRef) => popoverRef.afterClosed$.pipe(map(() => false))),
      startWith(true)
    );
  }

  openSearch(): void {
    this.dialog.open(SearchModalComponent, {
      panelClass: 'vex-dialog-glossy',
      width: '100%',
      maxWidth: '600px'
    });
  }

  getRoleName(name: string) {
    let roleName = '';
    switch (name) {
      case 'Owner':
        roleName = 'Propriétaire';
        break;
      case 'Seller':
        roleName = 'Vendeur';
        break;
      case 'Manager':
        roleName = 'Directeur';
        break;
      default:
        break;
        return roleName;
    }
  }
}
