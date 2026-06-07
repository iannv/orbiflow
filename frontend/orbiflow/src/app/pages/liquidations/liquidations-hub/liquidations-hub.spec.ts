import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router'; 
import { Location } from '@angular/common';
import { of } from 'rxjs';
import { Component } from '@angular/core';

import { LiquidationsHub } from './liquidations-hub';
import { LiquidationService } from '../../../services/liquidation-service';

// Dummies con selectores para la prueba de enrutamiento
@Component({ standalone: true, selector: 'app-dummy-pre', template: '' }) class DummyPreLiquidation {}
@Component({ standalone: true, selector: 'app-dummy-liq', template: '' }) class DummyLiquidation {}
@Component({ standalone: true, selector: 'app-dummy-closed', template: '' }) class DummyClosed {}

describe('LiquidationsHub', () => {
  let component: LiquidationsHub;
  let fixture: ComponentFixture<LiquidationsHub>;
  let mockLiquidationService: any;
  let router: Router;
  let location: Location;

  beforeEach(async () => {
    // Se simula la lógica del negocio para los contadores (Batch 1)
    mockLiquidationService = {
      getPeriods: vi.fn((status: string) => {
        if (status === 'open') return of([{ id: 1 }, { id: 2 }]);
        if (status === 'reviewed') return of([{ id: 3 }]);
        return of([]);
      })
    };

    await TestBed.configureTestingModule({
      imports: [LiquidationsHub],
      providers: [
        { provide: LiquidationService, useValue: mockLiquidationService },
        // Se configura el enrutador real para las pruebas de navegación (Batch 2)
        provideRouter([
          { path: 'liquidaciones/pre-liquidation', component: DummyPreLiquidation },
          { path: 'liquidaciones/liquidation', component: DummyLiquidation },
          { path: 'liquidaciones/closed-liquidations', component: DummyClosed }
        ])
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(LiquidationsHub);
    component = fixture.componentInstance;
    router = TestBed.inject(Router);
    location = TestBed.inject(Location);
    
    // Se inicializa la navegación y la detección de cambios
    router.initialNavigation();
    fixture.detectChanges(); 
  });

  // ::: Batch 1: Inicialización y carga de notificaciones de estado :::

  it('debe crear el componente y consultar las cantidades de periodos pendientes', () => {
    expect(component).toBeTruthy();
    
    // Se audita que el servicio haya sido llamado con los parámetros correctos
    expect(mockLiquidationService.getPeriods).toHaveBeenCalledWith('open');
    expect(mockLiquidationService.getPeriods).toHaveBeenCalledWith('reviewed');
  });

  it('debe asignar los contadores correctamente basados en la respuesta del backend', () => {
    //  simulamos 2 abiertos y 1 en revisión
    expect(component.openPeriodsCount).toBe(2);
    expect(component.reviewedPeriodsCount).toBe(1);
  });

  // ::: Batch 2: Integración de Navegación del Hub :::

  it('debe navegar hacia Pre-Liquidaciones al hacer clic en la tarjeta correspondiente', async () => {
    const preLiqCard = fixture.nativeElement.querySelector('div[routerLink="/liquidaciones/pre-liquidation"]');
    
    preLiqCard.click();
    await fixture.whenStable(); 
    
    expect(location.path()).toBe('/liquidaciones/pre-liquidation');
  });

  it('debe navegar hacia Cierre de Liquidaciones al hacer clic en la tarjeta correspondiente', async () => {
    const liqCard = fixture.nativeElement.querySelector('div[routerLink="/liquidaciones/liquidation"]');
    
    liqCard.click();
    await fixture.whenStable();

    expect(location.path()).toBe('/liquidaciones/liquidation');
  });

  it('debe navegar hacia el Historial de Cerrados al hacer clic en la tarjeta correspondiente', async () => {
    const closedCard = fixture.nativeElement.querySelector('div[routerLink="/liquidaciones/closed-liquidations"]');
    
    closedCard.click();
    await fixture.whenStable();

    expect(location.path()).toBe('/liquidaciones/closed-liquidations');
  });
});