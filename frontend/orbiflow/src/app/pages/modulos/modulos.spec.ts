import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

import { Modulos } from './modulos';

describe('Modulos', () => {
  let component: Modulos;
  let fixture: ComponentFixture<Modulos>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Modulos],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting()
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(Modulos);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});