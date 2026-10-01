import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ProfileShowUpdateComponent } from './profile-show-update.component';

describe('ProfileShowUpdateComponent', () => {
  let component: ProfileShowUpdateComponent;
  let fixture: ComponentFixture<ProfileShowUpdateComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [ProfileShowUpdateComponent]
    });
    fixture = TestBed.createComponent(ProfileShowUpdateComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
