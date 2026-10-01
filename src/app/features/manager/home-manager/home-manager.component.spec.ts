import { ComponentFixture, TestBed } from '@angular/core/testing';

import { HomeManagerComponent } from './home-manager.component';

describe('HomeManagerComponent', () => {
  let component: HomeManagerComponent;
  let fixture: ComponentFixture<HomeManagerComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [HomeManagerComponent]
    });
    fixture = TestBed.createComponent(HomeManagerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
