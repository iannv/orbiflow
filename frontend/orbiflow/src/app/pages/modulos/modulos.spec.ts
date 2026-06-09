import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { of, throwError } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';

import { Modulos } from './modulos';
import { ModulosService } from '../../services/modulos-service';

describe('Modulos Component', () => {
  let component: Modulos;
  let fixture: ComponentFixture<Modulos>;
  let mockModulosService: any;

  beforeEach(async () => {
    // Se crea el mock del servicio con datos simulados
    mockModulosService = {
      getModulos: vi.fn().mockReturnValue(
        of([
          {
            id: 1,
            name: 'Presentismo',
            calculation_type: 'simple',
            applies_to_cap: true,
            is_active: true,
            variants: [],
          },
        ]),
      ),
      createModulo: vi.fn().mockReturnValue(of({ success: true })),
      updateModulo: vi.fn().mockReturnValue(of({ success: true })),
      deleteModulo: vi.fn().mockReturnValue(of({ success: true })),
    };

    await TestBed.configureTestingModule({
      imports: [Modulos, ReactiveFormsModule],
      providers: [{ provide: ModulosService, useValue: mockModulosService }],
    }).compileComponents();

    fixture = TestBed.createComponent(Modulos);
    component = fixture.componentInstance;
    fixture.detectChanges(); // Se dispara el ciclo de vida inicial (ngOnInit)
  });

  // ::: Batch 1: Creación e inicialización de los valores iniciales :::

  it('debe crear el componente y cargar la lista de módulos', () => {
    expect(component).toBeTruthy();

    // Se verifica la correcta asignación de la lista desde el servicio
    expect(component.modulosList.length).toBe(1);
    expect(component.modulosList[0].name).toBe('Presentismo');
    expect(component.moduloForm).toBeDefined();
  });

  // ::: Batch 2: Validaciones principales del formulario :::

  it('debe invalidar el formulario si el nombre está vacío', () => {
    const nameControl = component.moduloForm.controls['name'];

    nameControl.setValue('');
    expect(nameControl.valid).toBe(false);
    expect(nameControl.hasError('required')).toBe(true);
  });

  it('debe invalidar el formulario si no se selecciona un tipo de cálculo', () => {
    const calcControl = component.moduloForm.controls['calculation_type'];

    calcControl.setValue(null);
    expect(calcControl.valid).toBe(false);
    expect(calcControl.hasError('required')).toBe(true);
  });

  // ::: Batch 3: Lógica del FormArray de variantes :::

  it('debe agregar y eliminar variantes dinámicamente', () => {
    // Se verifica que inicie vacío según el ngOnInit
    expect(component.variantesFormArray.length).toBe(0);

    // Se simula la adición de dos variantes
    component.agregarVariante();
    component.agregarVariante();
    expect(component.variantesFormArray.length).toBe(2);

    // Se simula la eliminación de la primera variante
    component.eliminarVariante(0);
    expect(component.variantesFormArray.length).toBe(1);
  });

  it('NO debe guardar el módulo si no posee al menos una variante y debe mostrar mensaje de error', () => {
    const spyCreate = vi.spyOn(mockModulosService, 'createModulo');
    component.variantesFormArray.clear();
    component.guardarModulo();
    expect(spyCreate).not.toHaveBeenCalled();
    expect(component.mgeError).toBe(
      'Debe agregar al menos una variante al módulo para realizar cálculos.',
    );
  });

  it('NO debe guardar si una variante de tipo porcentaje supera el 100%', () => {
    component.agregarVariante();
    const variante = component.variantesFormArray.at(0);
    variante.patchValue({
      name: 'Excedida',
      type: 'percentage',
      value: 150,
    });
    component.guardarModulo();
    expect(variante.get('value')?.hasError('max')).toBe(true);
    expect(component.mgeError).toBe(
      'El valor no puede superar el 100% cuando el tipo es Porcentaje.',
    );
  });

  // ::: Batch 4: Lógica condicional y manejo de modales :::

  it('debe abrir el modal para un nuevo módulo y limpiar el formulario', () => {
    // Se carga un nombre de prueba
    component.moduloForm.patchValue({ name: 'Módulo de Prueba' });
    component.agregarVariante();

    // Se abre el modal
    component.openModal();

    // Se verifica la correcta limpieza y apertura
    expect(component.isModalOpen).toBe(true);
    expect(component.moduloEnEdicion).toBeNull();
    expect(component.moduloForm.get('name')?.value).toBeNull();
    expect(component.variantesFormArray.length).toBe(0);
  });

  it('debe cargar los datos correctamente al editar un módulo existente', () => {
    const moduloSimulado = {
      id: 2,
      name: 'Antigüedad',
      description: 'Test',
      calculation_type: 'seniority',
      is_exclusive: false,
      applies_to_cap: true,
      is_active: true,
      variants: [{ id: 10, name: 'Anual', type: 'fixed_amount', value: 5000, is_default: true }],
    };

    // Se simula la edición
    component.editarModulo(moduloSimulado as any);

    // Se audita la carga de datos en el formulario
    expect(component.isModalOpen).toBe(true);
    expect(component.moduloEnEdicion).toEqual(moduloSimulado);
    expect(component.moduloForm.get('name')?.value).toBe('Antigüedad');
    expect(component.variantesFormArray.length).toBe(1);
    expect(component.variantesFormArray.at(0).get('value')?.value).toBe(5000);
  });

  // ::: Batch 5: Lógica de guardado e integración (Happy Path) :::

  it('debe llamar al servicio de guardado si los datos y variantes son correctos', () => {
    const spyCreate = vi.spyOn(mockModulosService, 'createModulo');
    const spyToast = vi.spyOn(component, 'lanzarToast');
    const spyCloseModal = vi.spyOn(component, 'closeModal');

    // Se preparan datos válidos
    component.openModal();
    component.moduloForm.patchValue({ name: 'Viáticos', calculation_type: 'simple' });

    component.agregarVariante();
    component.variantesFormArray
      .at(0)
      .patchValue({ name: 'Única', type: 'fixed_amount', value: 1000 });

    // Guardado
    component.guardarModulo();

    // Se verifica el correcto funcionamiento
    expect(spyCreate).toHaveBeenCalled();
    expect(spyToast).toHaveBeenCalledWith(
      'Módulo guardado',
      'El nuevo concepto se registró en el sistema.',
    );
    expect(spyCloseModal).toHaveBeenCalled();
  });

  // ::: Batch 6: Lógica de eliminación :::

  it('debe solicitar confirmación antes de eliminar y luego ejecutar el borrado', () => {
    const spyDelete = vi.spyOn(mockModulosService, 'deleteModulo');
    const spyLoad = vi.spyOn(component, 'cargarModulos');

    // Se acciona el botón de eliminar fila
    component.confirmarEliminacion(1);

    // Se verifica la apertura del modal de confirmación
    expect(component.moduloAEliminarId).toBe(1);
    expect(component.isConfirmModalOpen).toBe(true);

    // Se fuerza la confirmación definitiva
    component.eliminarModuloDefinitivo();

    // Se audita el impacto en el servicio y la actualización de la tabla
    expect(spyDelete).toHaveBeenCalledWith(1);
    expect(component.isConfirmModalOpen).toBe(false);
    expect(component.moduloAEliminarId).toBeUndefined();
    expect(spyLoad).toHaveBeenCalled();
  });
});
