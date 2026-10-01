import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SurveillantListComponent } from './surveillant-list.component';

describe('SurveillantListComponent', () => {
  let component: SurveillantListComponent;
  let fixture: ComponentFixture<SurveillantListComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [SurveillantListComponent]
    });
    fixture = TestBed.createComponent(SurveillantListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
