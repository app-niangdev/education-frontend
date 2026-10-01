import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SurveillantAddUpdateComponent } from './surveillant-add-update.component';

describe('SurveillantAddUpdateComponent', () => {
  let component: SurveillantAddUpdateComponent;
  let fixture: ComponentFixture<SurveillantAddUpdateComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [SurveillantAddUpdateComponent]
    });
    fixture = TestBed.createComponent(SurveillantAddUpdateComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
