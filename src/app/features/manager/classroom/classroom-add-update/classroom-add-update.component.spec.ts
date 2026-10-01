import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ClassroomAddUpdateComponent } from './classroom-add-update.component';

describe('ClassroomAddUpdateComponent', () => {
  let component: ClassroomAddUpdateComponent;
  let fixture: ComponentFixture<ClassroomAddUpdateComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [ClassroomAddUpdateComponent]
    });
    fixture = TestBed.createComponent(ClassroomAddUpdateComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
