import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Modulos } from './modulos';

describe('Modulos', () => {
  let component: Modulos;
  let fixture: ComponentFixture<Modulos>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Modulos],
    }).compileComponents();

    fixture = TestBed.createComponent(Modulos);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
