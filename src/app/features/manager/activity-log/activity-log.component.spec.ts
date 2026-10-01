import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { provideToastr } from 'ngx-toastr';
import { provideRouter } from '@angular/router';
import { MatIconRegistry } from '@angular/material/icon';
import { DomSanitizer } from '@angular/platform-browser';

import { ActivityLogComponent } from './activity-log.component';
import { ActivityLog } from 'src/app/interfaces/ActivityLog';

/** Entrée de journal représentative : une modification avec un champ changé. */
const LOG_MODIFICATION = {
  id: 7,
  user_id: 1,
  user: { id: 1, first_name: 'Awa', last_name: 'Ndiaye', email: 'a@b.sn' },
  action: 'updated',
  module: 'enseignants',
  description: "Modification de l'enseignant",
  subject_type: 'App\\Models\\Enseignant',
  subject_id: 1,
  old_values: { id: 1, matricule: 'ENS-001', salaire_base: 200000, updated_at: '2026-07-01' },
  new_values: { id: 1, matricule: 'ENS-001', salaire_base: 250000, updated_at: '2026-07-02' },
  ip_address: '127.0.0.1',
  user_agent: 'Mozilla/5.0',
  created_at: '2026-07-26T10:00:00Z',
  updated_at: '2026-07-26T10:00:00Z'
} as unknown as ActivityLog;

/** Une connexion : aucun avant/après enregistré. */
const LOG_CONNEXION = {
  ...LOG_MODIFICATION,
  id: 9,
  action: 'login',
  module: 'auth',
  old_values: null,
  new_values: null
} as unknown as ActivityLog;

describe('ActivityLogComponent', () => {
  let component: ActivityLogComponent;
  let fixture: ComponentFixture<ActivityLogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ActivityLogComponent, NoopAnimationsModule],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideToastr(),
        provideRouter([])
      ]
    }).compileComponents();

    // Les icônes « mat:* » viennent d'un resolver applicatif absent des tests :
    // on en fournit un neutre pour éviter le bruit d'erreurs.
    const registry = TestBed.inject(MatIconRegistry);
    const sanitizer = TestBed.inject(DomSanitizer);
    registry.addSvgIconResolver(
      () => sanitizer.bypassSecurityTrustResourceUrl('data:image/svg+xml;base64,') as any
    );

    fixture = TestBed.createComponent(ActivityLogComponent);
    component = fixture.componentInstance;

    // Premier cycle : ngOnInit déclenche loadData(), qui met loading à true et
    // laisse la requête en attente (backend de test). On neutralise ensuite le
    // spinner pour que le tableau soit rendu — c'est lui que l'on teste.
    fixture.detectChanges();
    component.loading = false;
    component.dataSource.data = [LOG_MODIFICATION, LOG_CONNEXION];
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it("n'affiche aucune ligne de détail tant que rien n'est déplié", () => {
    const detail = fixture.nativeElement.querySelectorAll('td.p-0');
    expect(detail.length).toBe(0);
  });

  it('affiche la ligne de détail après toggleExpand (régression multiTemplateDataRows)', fakeAsync(() => {
    component.toggleExpand(7);
    fixture.detectChanges();
    tick();

    const detail = fixture.nativeElement.querySelector('td.p-0');
    expect(detail)
      .withContext('la ligne de détail doit être présente dans le DOM')
      .toBeTruthy();
    expect(detail.textContent)
      .withContext('elle doit afficher le champ réellement modifié')
      .toContain('Salaire de base');
  }));

  it('la ligne de détail est visible (opacité non nulle)', fakeAsync(() => {
    component.toggleExpand(7);
    fixture.detectChanges();
    tick();

    const detail = fixture.nativeElement.querySelector('td.p-0');
    const row = detail.closest('tr');
    const opacity = getComputedStyle(row).opacity;

    expect(opacity)
      .withContext('une ligne à opacity 0 est dans le DOM mais invisible')
      .not.toBe('0');
  }));

  it('ne liste que les champs modifiés, en ignorant les clés techniques', () => {
    const changes = component.changesFor(LOG_MODIFICATION);

    expect(changes.length).toBe(1);
    expect(changes[0].label).toBe('Salaire de base');
    expect(changes[0].before).toBe('200000');
    expect(changes[0].after).toBe('250000');
  });

  it("signale l'absence de détail pour une connexion", () => {
    expect(component.changesFor(LOG_CONNEXION)).toEqual([]);
  });

  it('referme la ligne au second appel', () => {
    component.toggleExpand(7);
    expect(component.expanded).toBe(7);

    component.toggleExpand(7);
    expect(component.expanded).toBeNull();
  });
});
