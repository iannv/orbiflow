import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { provideRouter, Router } from '@angular/router';
import { of } from 'rxjs';

import { PreLiquidationComponent } from './pre-liquidation';
import { LiquidationService } from '../../../services/liquidation-service';
import { AssociateService } from '../../../services/associate-service';

describe('PreLiquidationComponent', () => {
  let component: PreLiquidationComponent;
  let fixture: ComponentFixture<PreLiquidationComponent>;
  let mockLiquidationService: any;
  let mockAssociateService: any;
  let router: Router;

  beforeEach(async () => {
    // Se construyen los mocks de los servicios
    mockLiquidationService = {
      getGlobalConfig: vi.fn().mockReturnValue(of([{ hour_value: '6000', cap_percentage: '35' }])),
      createPeriod: vi.fn().mockReturnValue(of({ id: 1, month: 6, year: 2026 })),
      getPeriods: vi.fn().mockReturnValue(of([{ id: 1, month: 6, year: 2026, applied_hour_value: '6000', applied_cap_pct: '35' }])),
      simulateLiquidation: vi.fn().mockReturnValue(of([{ associate_id: 10, total_amount: 150000, cap_adjustment: 0 }])),
      uploadHours: vi.fn().mockReturnValue(of({ success: true })),
      updatePeriodStatus: vi.fn().mockReturnValue(of({ success: true })),
      deletePeriod: vi.fn().mockReturnValue(of({ success: true }))
    };

    mockAssociateService = {
      getAssociates: vi.fn().mockReturnValue(of([
        { id: 10, full_name: 'Asociado Antiguo', base_hours: 8, entry_date: '2025-05-15' },
        { id: 11, full_name: 'Asociado Futuro', base_hours: 4, entry_date: '2026-08-01' }
      ]))
    };

    await TestBed.configureTestingModule({
      imports: [PreLiquidationComponent, FormsModule],
      providers: [
        provideRouter([]),
        { provide: LiquidationService, useValue: mockLiquidationService },
        { provide: AssociateService, useValue: mockAssociateService }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(PreLiquidationComponent);
    component = fixture.componentInstance;
    router = TestBed.inject(Router);
    fixture.detectChanges(); // Dispara el ngOnInit
  });

  // ::: Batch 1: Creación e inicialización :::
  
  it('debe crear el componente y cargar los periodos abiertos', () => {
    expect(component).toBeTruthy();
    
    // Se verifica la carga inicial desde el servicio
    expect(component.periods.length).toBe(1);
    expect(mockLiquidationService.getPeriods).toHaveBeenCalledWith('open');
  });

  // ::: Batch 2: Validaciones de creación de periodo :::

it('debe invalidar el formulario y alertar si el año ingresado es incorrecto', () => {
    const spyToast = vi.spyOn(component, 'lanzarToast');
    const spyCreate = vi.spyOn(mockLiquidationService, 'createPeriod');

    // Se fuerza un año inválido (fuera del rango de años de 1900-2999)
    component.newPeriodYear = 1899; 
    expect(component.isYearValid()).toBe(false);

    component.onCreatePeriod();

    expect(spyCreate).not.toHaveBeenCalled();
    expect(spyToast).toHaveBeenCalledWith('Dato Incorrecto', 'Por favor, ingrese un año válido de 4 cifras.');
  });

  // ::: Batch 3: Lógica de carga y filtrado de asociados :::

  it('debe filtrar la nómina excluyendo a los asociados ingresados en meses posteriores al periodo', () => {
    // Se simula la selección del periodo de Junio 2026 (mes 6, año 2026)
    component.selectedPeriodId = 1;

    // Se acciona la carga de datos
    component.onLoadData();

    // Se audita que solo se liste al "Asociado Antiguo" (2025) y se excluya al "Futuro" (Agosto 2026)
    expect(component.associates.length).toBe(1);
    expect(component.associates[0].id).toBe(10);
    expect(component.dataLoaded).toBe(true);
  });

  // ::: Batch 4: Lógica matemática del autocompletado :::

  it('debe autocompletar las horas multiplicando la jornada base por los días hábiles', () => {
    component.selectedPeriodId = 1;
    component.onLoadData(); // Carga al Asociado 10 (base 8 hs)

    // Se ingresan 22 días hábiles y se ejecuta el autocompletado
    component.diasHabiles = 22;
    component.autoCompleteHours();

    // Se verifica la exactitud matemática (8 horas * 22 días = 176)
    expect(component.hoursData[10]).toBe(176);
  });

  // ::: Batch 5: Flujo de simulación y guardado final (Happy Path) :::

  it('debe armar el payload correctamente y enviar la simulación solo con los asociados seleccionados', () => {
    const spySimulate = vi.spyOn(mockLiquidationService, 'simulateLiquidation');
    component.selectedPeriodId = 1;
    component.onLoadData();

    // Se configuran horas manuales
    component.hoursData[10] = 160;

    // Se acciona la simulación
    component.onSimulate();

    // Se audita la construcción del payload
    expect(spySimulate).toHaveBeenCalledWith(1, {
      entries: [{ associate_id: 10, hours_worked: 160 }]
    });
    expect(component.simulationResults.length).toBe(1);
  });

it('debe aprobar la revisión, guardar horas, cambiar el estado y redirigir asíncronamente', () => {
    vi.useFakeTimers();

    const spyUpload = vi.spyOn(mockLiquidationService, 'uploadHours');
    const spyStatus = vi.spyOn(mockLiquidationService, 'updatePeriodStatus');
    const spyNavigate = vi.spyOn(router, 'navigate');

    component.selectedPeriodId = 1;
    component.onLoadData();
    component.hoursData[10] = 160;

    // Se ejecuta la aprobación definitiva
    component.confirmApproveReview();

    // Se audita la orquestación y el impacto en los servicios
    expect(spyUpload).toHaveBeenCalled();
    expect(spyStatus).toHaveBeenCalledWith(1, 'reviewed');
    expect(component.isApproveModalOpen).toBe(false);

    // Se simula el paso temporal exacto del setTimeout (3500ms) 
    vi.advanceTimersByTime(3500);

    // Se verifica la correcta redirección a la siguiente pantalla
    expect(spyNavigate).toHaveBeenCalledWith(['/liquidaciones']);

    // 3. Se devuelve el reloj a la normalidad para no afectar otros tests
    vi.useRealTimers();
  });

  // ::: Batch 6: Lógica de eliminación :::

  it('debe descartar el periodo y resetear la vista correctamente', () => {
    const spyDelete = vi.spyOn(mockLiquidationService, 'deletePeriod');
    
    component.selectedPeriodId = 1;
    component.dataLoaded = true;

    // Se fuerza la confirmación de eliminación
    component.confirmarEliminacionPeriodo();

    // Se audita la limpieza del estado
    expect(spyDelete).toHaveBeenCalledWith(1);
    expect(component.selectedPeriodId).toBeNull();
    expect(component.dataLoaded).toBe(false);
    expect(component.isConfirmModalOpen).toBe(false);
  });
});