import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NiveauxListComponent } from './niveaux-list.component';

describe('NiveauxListComponent', () => {
  let component: NiveauxListComponent;
  let fixture: ComponentFixture<NiveauxListComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [NiveauxListComponent]
    });
    fixture = TestBed.createComponent(NiveauxListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
