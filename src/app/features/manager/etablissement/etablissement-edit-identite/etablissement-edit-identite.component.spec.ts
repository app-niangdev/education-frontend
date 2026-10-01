import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EtablissementEditIdentiteComponent } from './etablissement-edit-identite.component';

describe('EtablissementEditIdentiteComponent', () => {
  let component: EtablissementEditIdentiteComponent;
  let fixture: ComponentFixture<EtablissementEditIdentiteComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [EtablissementEditIdentiteComponent]
    });
    fixture = TestBed.createComponent(EtablissementEditIdentiteComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
