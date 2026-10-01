import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TresorierAddUpdateComponent } from './tresorier-add-update.component';

describe('TresorierAddUpdateComponent', () => {
  let component: TresorierAddUpdateComponent;
  let fixture: ComponentFixture<TresorierAddUpdateComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [TresorierAddUpdateComponent]
    });
    fixture = TestBed.createComponent(TresorierAddUpdateComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
