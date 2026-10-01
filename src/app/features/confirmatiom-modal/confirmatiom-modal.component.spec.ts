import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ConfirmatiomModalComponent } from './confirmatiom-modal.component';

describe('ConfirmatiomModalComponent', () => {
  let component: ConfirmatiomModalComponent;
  let fixture: ComponentFixture<ConfirmatiomModalComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [ConfirmatiomModalComponent]
    });
    fixture = TestBed.createComponent(ConfirmatiomModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
