import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ProfileSecurityComponent } from './profile-security.component';

describe('ProfileSecurityComponent', () => {
  let component: ProfileSecurityComponent;
  let fixture: ComponentFixture<ProfileSecurityComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [ProfileSecurityComponent]
    });
    fixture = TestBed.createComponent(ProfileSecurityComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
