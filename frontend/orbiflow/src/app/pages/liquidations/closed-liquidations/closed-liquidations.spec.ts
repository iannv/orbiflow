import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, Subject } from 'rxjs';

import { ClosedLiquidationsComponent } from './closed-liquidations';
import { LiquidationService } from '../../../services/liquidation-service';
import { AssociateService } from '../../../services/associate-service';
import { PdfGeneratorService } from '../../../services/pdf-service';

describe('ClosedLiquidationsComponent', () => {
  let component: ClosedLiquidationsComponent;
  let fixture: ComponentFixture<ClosedLiquidationsComponent>;
  let mockLiquidationService: any;
  let mockAssociateService: any;
  let mockPdfService: any;

  beforeEach(async () => {
    // Se construyen los simuladores para los 3 servicios dependientes
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
      ]))
    };

    mockPdfService = {
      descargar: vi.fn()
    };

    await TestBed.configureTestingModule({
      imports: [ClosedLiquidationsComponent],
      providers: [
        { provide: LiquidationService, useValue: mockLiquidationService },
        { provide: AssociateService, useValue: mockAssociateService },
        { provide: PdfGeneratorService, useValue: mockPdfService }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ClosedLiquidationsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges(); // Se dispara la carga inicial de datos (ngOnInit)
  });

  // ::: Batch 1: Creación, Inicialización y Agrupación :::

  it('debe cargar los periodos cerrados y agruparlos por año en orden descendente', () => {
    expect(component).toBeTruthy();
    expect(component.isLoading).toBe(false);

    // Se verifica que la lógica de agrupación separe correctamente los años
    expect(component.years.length).toBe(2);
    
    // Se audita el ordenamiento descendente (2026 debe estar antes que 2025)
    expect(component.years[0]).toBe(2026);
    expect(component.years[1]).toBe(2025);

    // Se verifica la correcta asignación de periodos por llave
    expect(component.periodsByYear[2026].length).toBe(2);
    expect(component.periodsByYear[2025].length).toBe(1);
  });

  // ::: Batch 2: Lógica de Identificación de Asociados (Mapeo) :::

  it('debe resolver correctamente el nombre del asociado bajo múltiples estructuras de datos', () => {
    // Caso A: Se provee un ID numérico directo
    expect(component.getAssociateName(10)).toBe('Ana Martínez');

    // Caso B: Se provee un objeto anidado sin nombre (debe buscar en el mapa)
    expect(component.getAssociateName({ id: 10 })).toBe('Ana Martínez');

    // Caso C: Se provee un objeto con nombre explícito
    expect(component.getAssociateName({ id: 99, full_name: 'Socio Temporal' })).toBe('Socio Temporal');

    // Caso D: Se provee un dato nulo o inválido
    expect(component.getAssociateName(null)).toBe('Socio Desconocido');
  });

// ::: Batch 3: Visualización de Detalles y Prevención de Concurrencia :::

  it('debe abrir el modal, cargar el resumen y bloquear peticiones simultáneas', () => {
    // 1. Limpiamos la memoria 
    mockLiquidationService.getSummary.mockClear();

    // 2. Creamos un Subject para simular una petición HTTP en espera
    const mockHttpCall = new Subject<any>();
    mockLiquidationService.getSummary.mockReturnValue(mockHttpCall.asObservable());

    // 3. Se acciona el primer clic
    component.openDetailsModal(2);

    // Se verifica el cambio de estado visual y la solicitud al backend
    expect(component.isDetailsModalOpen).toBe(true);
    expect(component.isLoadingDetails).toBe(true);
    expect(mockLiquidationService.getSummary).toHaveBeenCalledTimes(1);

    // 4. Se fuerza un segundo clic por error (doble clic rápido)
    // Como el 'mockHttpCall' aún no respondió, el componente sigue bloqueado
    component.openDetailsModal(2);

    // Se audita que la protección haya funcionado (la función sigue siendo llamada solo 1 vez)
    expect(mockLiquidationService.getSummary).toHaveBeenCalledTimes(1);

    // 5. El servidor ficticio responda para liberar el componente
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

  // ::: Batch 4: Lógica de Exportación de Documentos (PDF) :::

  it('debe generar y enviar el documento al servicio de PDF con la nomenclatura correcta', () => {
    const spyDescargar = vi.spyOn(mockPdfService, 'descargar');

    // Se simula la existencia de un resumen cargado en pantalla
    component.selectedSummary = {
      period: { month: 8, year: 2026 },
      totals: {},
      retirements: []
    } as any;

    // Se acciona el botón de descarga
    component.descargarPDF();

    // Se verifica la construcción del nombre dinámico del archivo
    expect(spyDescargar).toHaveBeenCalled();
    const args = spyDescargar.mock.calls[0];
    const nombreGenerado = args[1]; 
    
    expect(nombreGenerado).toBe('Liquidacion_Agosto_2026.pdf');
  });
});