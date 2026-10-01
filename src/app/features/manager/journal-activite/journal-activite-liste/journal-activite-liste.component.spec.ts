import { ComponentFixture, TestBed } from '@angular/core/testing';

import { JournalActiviteListeComponent } from './journal-activite-liste.component';

describe('JournalActiviteListeComponent', () => {
  let component: JournalActiviteListeComponent;
  let fixture: ComponentFixture<JournalActiviteListeComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [JournalActiviteListeComponent]
    });
    fixture = TestBed.createComponent(JournalActiviteListeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
