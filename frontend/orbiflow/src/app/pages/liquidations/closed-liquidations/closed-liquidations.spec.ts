import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, Subject } from 'rxjs';

import { ClosedPeriodsPanelComponent } from '../../../components/closed-periods-panel/closed-periods-panel';
import { LiquidationService } from '../../../services/liquidation-service';
import { AssociateService } from '../../../services/associate-service';
import { PdfGeneratorService } from '../../../services/pdf-service';
import { AuthService } from '../../../core/auth/auth.service';

describe('ClosedPeriodsPanelComponent', () => {
  let component: ClosedPeriodsPanelComponent;
  let fixture: ComponentFixture<ClosedPeriodsPanelComponent>;
  let mockLiquidationService: any;
  let mockAssociateService: any;
  let mockPdfService: any;
  let mockAuthService: any;

  beforeEach(async () => {
    mockLiquidationService = {
      getPeriods: vi.fn().mockReturnValue(of([
        { id: 1, month: 12, year: 2025, status: 'closed' },
        { id: 2, month: 1, year: 2026, status: 'closed' },
        { id: 3, month: 2, year: 2026, status: 'closed' }
      ])),
      getSummary: vi.fn().mockReturnValue(of({
        period: { month: 1, year: 2026 },
        totals: { total_amount: '500000' },
        retirements: []
      }))
    };

    mockAssociateService = {
      getAssociates: vi.fn().mockReturnValue(of([
        { id: 10, full_name: 'Ana Martínez' }
      ])),
      getAssociateByUser: vi.fn().mockReturnValue(of([])),
    };

    mockPdfService = {
      descargar: vi.fn()
    };

    mockAuthService = {
      currentUser: vi.fn().mockReturnValue({ id: 1, role: 'admin' }),
    };

    await TestBed.configureTestingModule({
      imports: [ClosedPeriodsPanelComponent],
      providers: [
        { provide: LiquidationService, useValue: mockLiquidationService },
        { provide: AssociateService, useValue: mockAssociateService },
        { provide: PdfGeneratorService, useValue: mockPdfService },
        { provide: AuthService, useValue: mockAuthService },
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ClosedPeriodsPanelComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('debe cargar los periodos cerrados y agruparlos por año en orden descendente', () => {
    expect(component).toBeTruthy();
    expect(component.isLoading).toBe(false);
    expect(component.years.length).toBe(2);
    expect(component.years[0]).toBe(2026);
    expect(component.years[1]).toBe(2025);
    expect(component.periodsByYear[2026].length).toBe(2);
    expect(component.periodsByYear[2025].length).toBe(1);
  });

  it('debe resolver correctamente el nombre del asociado bajo múltiples estructuras de datos', () => {
    expect(component.getAssociateName(10)).toBe('Ana Martínez');
    expect(component.getAssociateName({ id: 10 })).toBe('Ana Martínez');
    expect(component.getAssociateName({ id: 99, full_name: 'Socio Temporal' })).toBe('Socio Temporal');
    expect(component.getAssociateName(null)).toBe('Socio Desconocido');
  });

  it('debe abrir el modal, cargar el resumen y bloquear peticiones simultáneas', () => {
    mockLiquidationService.getSummary.mockClear();

    const mockHttpCall = new Subject<any>();
    mockLiquidationService.getSummary.mockReturnValue(mockHttpCall.asObservable());

    component.openDetailsModal(2);

    expect(component.isDetailsModalOpen).toBe(true);
    expect(component.isLoadingDetails).toBe(true);
    expect(mockLiquidationService.getSummary).toHaveBeenCalledTimes(1);

    component.openDetailsModal(2);
    expect(mockLiquidationService.getSummary).toHaveBeenCalledTimes(1);

    mockHttpCall.next({ period: { month: 1, year: 2026 }, totals: {}, retirements: [] });
    expect(component.isLoadingDetails).toBe(false);
  });

  it('debe cerrar el modal y purgar los datos de memoria', () => {
    component.isDetailsModalOpen = true;
    component.selectedSummary = { period: { month: 1, year: 2026 } } as any;

    component.closeDetailsModal();

    expect(component.isDetailsModalOpen).toBe(false);
    expect(component.selectedSummary).toBeNull();
  });

  it('debe generar y enviar el documento al servicio de PDF con la nomenclatura correcta', () => {
    const spyDescargar = vi.spyOn(mockPdfService, 'descargar');

    component.selectedSummary = {
      period: { month: 8, year: 2026 },
      totals: {},
      retirements: []
    } as any;

    component.descargarPDF();

    expect(spyDescargar).toHaveBeenCalled();
    const args = spyDescargar.mock.calls[0];
    expect(args[1]).toBe('Liquidacion_Agosto_2026.pdf');
  });

  it('con filtro de rango, debe exigir confirmación antes de mostrar periodos', () => {
    const rangeFixture = TestBed.createComponent(ClosedPeriodsPanelComponent);
    rangeFixture.componentInstance.showMonthRangeFilter = true;
    rangeFixture.detectChanges();

    expect(rangeFixture.componentInstance.rangeApplied).toBe(false);
    expect(rangeFixture.componentInstance.years.length).toBe(0);
  });

  it('con filtro de rango, debe filtrar periodos al confirmar rango personalizado', () => {
    component.showMonthRangeFilter = true;
    component.rangeMode = 'custom';
    component.allPeriods = [
      { id: 1, month: 12, year: 2025, status: 'closed' },
      { id: 2, month: 1, year: 2026, status: 'closed' },
      { id: 3, month: 2, year: 2026, status: 'closed' },
    ] as any[];
    component.startMonthYear = '2026-01';
    component.endMonthYear = '2026-02';

    component.confirmMonthRange();

    expect(component.rangeApplied).toBe(true);
    expect(component.appliedRangeSummary).toContain('2026');
    expect(component.years).toEqual([2026]);
    expect(component.periodsByYear[2026].length).toBe(2);
  });

  it('con filtro de rango, debe mostrar todos los periodos al elegir la opción Todos', () => {
    component.showMonthRangeFilter = true;
    component.rangeMode = 'all';
    component.allPeriods = [
      { id: 1, month: 12, year: 2025, status: 'closed' },
      { id: 2, month: 1, year: 2026, status: 'closed' },
    ] as any[];

    component.confirmMonthRange();

    expect(component.rangeApplied).toBe(true);
    expect(component.appliedRangeSummary).toBe('Todos los periodos disponibles');
    expect(component.years.length).toBe(2);
  });
});
