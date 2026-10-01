import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NiveauxAddEditComponent } from './niveaux-add-edit.component';

describe('NiveauxAddEditComponent', () => {
  let component: NiveauxAddEditComponent;
  let fixture: ComponentFixture<NiveauxAddEditComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [NiveauxAddEditComponent]
    });
    fixture = TestBed.createComponent(NiveauxAddEditComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
