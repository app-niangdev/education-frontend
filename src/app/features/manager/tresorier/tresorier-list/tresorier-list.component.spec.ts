import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TresorierListComponent } from './tresorier-list.component';

describe('TresorierListComponent', () => {
  let component: TresorierListComponent;
  let fixture: ComponentFixture<TresorierListComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [TresorierListComponent]
    });
    fixture = TestBed.createComponent(TresorierListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
