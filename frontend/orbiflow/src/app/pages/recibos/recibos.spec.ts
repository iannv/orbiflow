import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { vi } from 'vitest';

import { Recibos } from './recibos';
import { AuthService } from '../../core/auth/auth.service';
import { AssociateService } from '../../services/associate-service';
import { LiquidationService } from '../../services/liquidation-service';
import { RetirementService } from '../../services/retirement-service';
import { UserService } from '../../services/user-service';

// MOCKS
const authServiceMock = {
  currentUser: vi.fn(),
};

const associateServiceMock = {
  getAssociateByUser: vi.fn(),
};

const retirementServiceMock = {
  getRetirementsByAssociate: vi.fn(),
};

const liquidationServiceMock = {
  getPeriods: vi.fn(),
  getRetirementsByLiquidation: vi.fn(),
};

const userServiceMock = {
  getUserById: vi.fn(),
};

const cdrMock = {
  detectChanges: vi.fn(),
};

describe('Recibos', () => {
  let component: Recibos;
  let fixture: ComponentFixture<Recibos>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Recibos],
      providers: [
        { provide: AuthService, useValue: authServiceMock },
        { provide: AssociateService, useValue: associateServiceMock },
        { provide: RetirementService, useValue: retirementServiceMock },
        { provide: UserService, useValue: userServiceMock },
        { provide: LiquidationService, useValue: liquidationServiceMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Recibos);
    component = fixture.componentInstance;
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // -------------------------------------------------------------------------
  // getRetirements - Obtener los recibos de un asociado en período cerrado
  it('debe obtener todos los recibos de un asociado si el período está cerrado', () => {
    authServiceMock.currentUser.mockReturnValue({ id: 1 });
    associateServiceMock.getAssociateByUser.mockReturnValue(of([{ id: 10 }]));

    retirementServiceMock.getRetirementsByAssociate.mockReturnValue(
      of([{ id: 1, liquidation: 100 }]),
    );

    liquidationServiceMock.getPeriods.mockReturnValue(
      of([{ id: 100, year: 2026, month: 5, status: 'closed' }]),
    );

    const getYearsSpy = vi.spyOn(component, 'getYears');
    component.getRetirements();
    expect(component.retirementsList.length).toBe(1);
    expect(component.periodsList.length).toBe(1);
    expect(getYearsSpy).toHaveBeenCalled();
  });

  // -------------------------------------------------------------------------
  // No deben obtenerse periodos en estado 'abierto' o 'en revisión'
  it('no deben obtenerse períodos que no estén en estado cerrado', () => {
    component.periodsList = [
      { id: 100, year: 2026, month: 5, status: 'closed' },
      { id: 101, year: 2026, month: 4, status: 'open' },
      { id: 102, year: 2026, month: 3, status: 'in_review' },
    ] as any;

    component.retirementsList = [
      { id: 1, liquidation: 100 },
      { id: 2, liquidation: 101 },
      { id: 3, liquidation: 102 },
    ] as any;

    const result = component.getRetirementsByYear(2026);
    expect(result.length).toBe(1);
    expect(result[0].liquidation).toBe(100);
  });

  // -------------------------------------------------------------------------
  // getPeriod - Obtener el período completo del mes y año
  it('debe obtener período completo de mes y año', () => {
    component.periodsList = [{ id: 100, year: 2026, month: 5, status: 'closed' }] as any;
    const result = component.getPeriod({ liquidation: 100 } as any);
    expect(result).toBe('Mayo 2026');
  });

  // -------------------------------------------------------------------------
  // getRetirementsByYear - Obtener todos los recibos ordenados
  it('debe obtener recibos ordenados por mes descendiente', () => {
    component.periodsList = [
      { id: 100, year: 2026, month: 5, status: 'closed' },
      { id: 99, year: 2026, month: 4, status: 'closed' },
      { id: 98, year: 2026, month: 3, status: 'closed' },
      { id: 97, year: 2026, month: 2, status: 'closed' },
    ] as any;

    component.retirementsList = [
      { id: 1, liquidation: 100 },
      { id: 2, liquidation: 99 },
      { id: 3, liquidation: 98 },
      { id: 4, liquidation: 97 },
    ] as any;

    const result = component.getRetirementsByYear(2026);
    expect(result.length).toBe(4);
    expect(result.map((r) => r.liquidation)).toEqual([100, 99, 98, 97]);
  });

  // -------------------------------------------------------------------------
  // generateDataRetirement - Generar los recibos con los datos correspondientes
  it('debe generar data del recibo correctamente', () => {
    const mockUser = { id: 1 };
    const mockAssociate = [{ id: 10, user: 20 }];
    const mockUserData = { id: 20, role: 'admin' };
    const mockPeriods = [{ id: 100, year: 2026, month: 5 }];
    const mockConcepts = [{ id: 1 }];

    authServiceMock.currentUser.mockReturnValue(mockUser);
    associateServiceMock.getAssociateByUser.mockReturnValue(of(mockAssociate));
    userServiceMock.getUserById.mockReturnValue(of(mockUserData));
    liquidationServiceMock.getPeriods.mockReturnValue(of(mockPeriods));
    liquidationServiceMock.getRetirementsByLiquidation.mockReturnValue(of(mockConcepts));

    const callback = vi.fn();
    const retirement = {
      id: 1,
      liquidation: 100,
      total_amount: 5000,
    } as any;

    component.generateDataRetirement(retirement, callback);
    expect(callback).toHaveBeenCalled();
    const result = callback.mock.calls[0][0];
    expect(result).toEqual(
      expect.objectContaining({
        associate: mockAssociate[0],
        user: mockUserData,
        liquidation: mockPeriods[0],
        totalToString: expect.any(String),
        totalFormatted: expect.any(String),
      }),
    );
  });

  // -------------------------------------------------------------------------
  // downloadPDF - Verificar la descarga del recibo en PDF
  it('debe llamar al servicio de descarga del PDF', () => {
    const retirement = {
      id: 1,
      liquidation: 100,
      total_amount: 5000,
    } as any;
    const pdfMock = 'pdf-generated';

    vi.spyOn(component, 'generateDataRetirement').mockImplementation((_, cb) => {
      cb({
        associate: { full_name: 'Juan Gomez' },
        totalToString: 'dos millones quinientos mil con cero centavos',
        totalFormatted: '$2.500.000,00',
      });
      const pdfServiceMock = {
        descargar: vi.fn(),
      };
      component['pdfService'] = pdfServiceMock as any;
      component.downloadPDF(retirement);
      expect(pdfServiceMock.descargar).toHaveBeenCalled();
    });
  });
});
