import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Sidenav2 } from './sidenav2';

describe('Sidenav2', () => {
  let component: Sidenav2;
  let fixture: ComponentFixture<Sidenav2>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Sidenav2],
    }).compileComponents();

    fixture = TestBed.createComponent(Sidenav2);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
