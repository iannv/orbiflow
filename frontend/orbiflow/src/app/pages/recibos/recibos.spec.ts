import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';

import { Recibos } from './recibos';

describe('Recibos', () => {
  let component: Recibos;
  let fixture: ComponentFixture<Recibos>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Recibos],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(Recibos);
    component = fixture.componentInstance;
    // userService = TestBed.inject(UserService);
    component.ngOnInit();
    // fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // Obtener recibos de un asociado
  // getRetirements()

  // Obtener período completo de mes y año de la liquidación
  // getPeriod

  // Obtener los recibos de cada mes y año, ordenados por mes descendiente
  // getRetirementsByYear(year: number): Retirement[] {

  // Obtener los datos del recibo
  // generateDataRetirement

  // Verificar la descarga del recibo en PDF
  // downloadPDF
});
