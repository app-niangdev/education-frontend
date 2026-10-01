import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SchoolYearListComponent } from './school-year-list.component';

describe('SchoolYearListComponent', () => {
  let component: SchoolYearListComponent;
  let fixture: ComponentFixture<SchoolYearListComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [SchoolYearListComponent]
    });
    fixture = TestBed.createComponent(SchoolYearListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
