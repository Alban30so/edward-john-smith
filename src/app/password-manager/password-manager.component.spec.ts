import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PasswordManagerComponent } from './password-manager.component';

describe('PasswordManagerComponent', () => {
  let component: PasswordManagerComponent;
  let fixture: ComponentFixture<PasswordManagerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PasswordManagerComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PasswordManagerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
