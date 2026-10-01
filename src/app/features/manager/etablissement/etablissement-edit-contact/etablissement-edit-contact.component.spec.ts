import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EtablissementEditContactComponent } from './etablissement-edit-contact.component';

describe('EtablissementEditContactComponent', () => {
  let component: EtablissementEditContactComponent;
  let fixture: ComponentFixture<EtablissementEditContactComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [EtablissementEditContactComponent]
    });
    fixture = TestBed.createComponent(EtablissementEditContactComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
