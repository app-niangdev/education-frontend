import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EnseignantAddUpdateComponent } from './enseignant-add-update.component';

describe('EnseignantAddUpdateComponent', () => {
  let component: EnseignantAddUpdateComponent;
  let fixture: ComponentFixture<EnseignantAddUpdateComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [EnseignantAddUpdateComponent]
    });
    fixture = TestBed.createComponent(EnseignantAddUpdateComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
