import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SchoolYearAddComponent } from './school-year-add.component';

describe('SchoolYearAddComponent', () => {
  let component: SchoolYearAddComponent;
  let fixture: ComponentFixture<SchoolYearAddComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [SchoolYearAddComponent]
    });
    fixture = TestBed.createComponent(SchoolYearAddComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
