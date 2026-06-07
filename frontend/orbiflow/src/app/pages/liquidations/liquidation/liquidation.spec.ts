import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { provideRouter, Router } from '@angular/router';
import { of } from 'rxjs';

import { LiquidationComponent } from './liquidation';
import { LiquidationService } from '../../../services/liquidation-service';
import { AssociateService } from '../../../services/associate-service';

describe('LiquidationComponent', () => {
  let component: LiquidationComponent;
  let fixture: ComponentFixture<LiquidationComponent>;
  let mockLiquidationService: any;
  let mockAssociateService: any;
  let router: Router;

  beforeEach(async () => {
    // Se configuran los mocks del backend
    mockLiquidationService = {
      getPeriods: vi.fn().mockReturnValue(of([{ id: 5, month: 7, year: 2026, applied_hour_value: '5000', applied_cap_pct: '30' }])),
      calculate: vi.fn().mockReturnValue(of([
        { associate_id: 1, base_amount: '100000', additional_amount: '20000', cap_adjustment: '0', total_amount: '120000' },
        { associate_id: 2, base_amount: '100000', additional_amount: '50000', cap_adjustment: '10000', total_amount: '140000' }
      ])),
      updatePeriodStatus: vi.fn().mockReturnValue(of({ success: true }))
    };

    mockAssociateService = {
      getAssociates: vi.fn().mockReturnValue(of([
        { id: 1, full_name: 'Juan Pérez' },
        { id: 2, full_name: 'María Gómez' }
      ]))
    };

    await TestBed.configureTestingModule({
      imports: [LiquidationComponent, FormsModule],
      providers: [
        provideRouter([]),
        { provide: LiquidationService, useValue: mockLiquidationService },
        { provide: AssociateService, useValue: mockAssociateService }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(LiquidationComponent);
    component = fixture.componentInstance;
    router = TestBed.inject(Router);
    fixture.detectChanges(); // Se dispara el ngOnInit()
  });

  // ::: Batch 1: Creación e Inicialización de Datos Base :::

  it('debe crear el componente y mapear los nombres de los asociados', () => {
    expect(component).toBeTruthy();
    
    // Se verifica la carga de periodos 'reviewed'
    expect(component.reviewedPeriods.length).toBe(1);
    
    // Se verifica la correcta construcción del diccionario de asociados
    expect(component.associatesMap[1]).toBe('Juan Pérez');
    expect(component.getAssociateName(2)).toBe('María Gómez');
  });

  // ::: Batch 2: Lógica Matemática de la Auditoría :::

  it('debe realizar el Dry-Run, solicitar los cálculos al backend y sumar correctamente los totales del resumen', () => {
    component.selectedPeriodId = 5;
    
    // Se acciona la petición de "Cargar Datos"
    component.onLoadData();

    // Se verifica que se haya llamado al endpoint de cálculo en modo lectura (true)
    expect(mockLiquidationService.calculate).toHaveBeenCalledWith(5, true);

    // Se audita la exactitud matemática del resumen totalizador
    expect(component.summary).not.toBeNull();
    expect(component.summary?.retirements_count).toBe(2);
    expect(component.summary?.totals.base_amount).toBe('200000.00'); // 100k + 100k
    expect(component.summary?.totals.additional_amount).toBe('70000.00'); // 20k + 50k
    expect(component.summary?.totals.cap_adjustment).toBe('10000.00'); // 0 + 10k
    expect(component.summary?.totals.total_amount).toBe('260000.00'); // 120k + 140k
  });

  // ::: Batch 3: Flujo Crítico de Cierre Definitivo (Transaccionalidad) :::

  it('debe ejecutar el cálculo persistente, actualizar el estado a cerrado y redirigir asíncronamente', () => {
    vi.useFakeTimers();

    const spyCalculate = vi.spyOn(mockLiquidationService, 'calculate');
    const spyUpdateStatus = vi.spyOn(mockLiquidationService, 'updatePeriodStatus');
    const spyNavigate = vi.spyOn(router, 'navigate');

    component.selectedPeriodId = 5;
    
    // Se acciona el botón rojo final
    component.onConfirmClose();

    // Se audita la correcta orquestación (modo ejecución = false)
    expect(spyCalculate).toHaveBeenCalledWith(5, false);
    expect(spyUpdateStatus).toHaveBeenCalledWith(5, 'closed');
    
    // Se verifica la limpieza de la pantalla de auditoría
    expect(component.summary).toBeNull();
    expect(component.isConfirmModalOpen).toBe(false);

    // Se simula la espera de la alerta Toast y la transición de pantalla
    vi.advanceTimersByTime(3500);
    expect(spyNavigate).toHaveBeenCalledWith(['/liquidaciones']);

    vi.useRealTimers();
  });

  // ::: Batch 4: Seguridad y Experiencia de Usuario (UX) :::

  it('debe bloquear el cierre definitivo si hay una petición en curso para evitar base de datos corrupta', () => {
    const spyCalculate = vi.spyOn(mockLiquidationService, 'calculate');
    
    component.selectedPeriodId = 5;
    
    // Se simula que el sistema ya está procesando una solicitud anterior
    component.isProcessing = true;

    // Se intenta disparar la acción nuevamente (spam clic)
    component.onConfirmClose();

    // Se verifica la inmutabilidad de la acción bloqueada
    expect(spyCalculate).not.toHaveBeenCalled();
  });

  it('debe abrir y cerrar los modales de desglose individual de asociados', () => {
    const itemSimulado = { associate_id: 1, total_amount: '120000' };

    // Se audita la apertura
    component.openDetailsModal(itemSimulado);
    expect(component.isDetailsModalOpen).toBe(true);
    expect(component.selectedDetail).toEqual(itemSimulado);

    // Se audita el cierre y limpieza de la memoria temporal
    component.closeDetailsModal();
    expect(component.isDetailsModalOpen).toBe(false);
    expect(component.selectedDetail).toBeNull();
  });
});