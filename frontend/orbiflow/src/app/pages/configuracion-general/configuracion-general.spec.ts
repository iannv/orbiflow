import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';

import { ConfiguracionGeneral } from './configuracion-general';
import { ConfiguracionService } from '../../services/configuracion-service';

describe('ConfiguracionGeneral', () => {
  let component: ConfiguracionGeneral;
  let fixture: ComponentFixture<ConfiguracionGeneral>;
  let mockConfigService: any;

  beforeEach(async () => {
    // Simulador del servicio original
    // Devuelve observables con datos para pruebas usando 'of()' de RxJS
    mockConfigService = {
      getConfigs: () => of([
        { id: 1, hour_value: '5000', cap_percentage: '30', user_name: 'Admin', change_date: '2026-06-04T12:00:00Z' }
      ]),
      createConfig: () => of({ success: true })
    };

    await TestBed.configureTestingModule({
      imports: [ConfiguracionGeneral, ReactiveFormsModule],
      providers: [
        provideRouter([]),
        // Enviamos el Mock Service a Angular
        { provide: ConfiguracionService, useValue: mockConfigService }
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ConfiguracionGeneral);
    component = fixture.componentInstance;
    fixture.detectChanges(); // inicia el ngOnInit y carga los datos del mock
  });

  // ::: Batch 1: Creación e inicialización  de los valores iniciales :::
  
  it('debe crear el componente y cargar la configuración inicial', () => {
    expect(component).toBeTruthy();
    
    // Verificamos que los Signals hayan tomado los datos del Mock
    expect(component.configs().length).toBe(1);
    expect(component.currentConfig()?.hour_value).toBe('5000');
    expect(component.isLoading()).toBe(false);
  });

  // ::: Batch 2: Validaciones del valor hora :::

  it('debe invalidar el formulario si el valor hora es 0 o negativo', () => {
    const hourControl = component.configForm.controls['hour_value'];
    
    hourControl.setValue(0);
    expect(hourControl.valid).toBeFalsy();
    expect(hourControl.hasError('min')).toBeTruthy();

    hourControl.setValue(-1500);
    expect(hourControl.valid).toBeFalsy();
  });

  it('debe invalidar el formulario si el valor hora está vacío', () => {
    const hourControl = component.configForm.controls['hour_value'];
    
    hourControl.setValue(null);
    expect(hourControl.valid).toBeFalsy();
    expect(hourControl.hasError('required')).toBeTruthy();
  });

  // ::: Batch 3: Validaciones del tope porcentual :::

  it('debe invalidar el formulario si el tope supera el 100%', () => {
    const capControl = component.configForm.controls['cap_percentage'];
    
    capControl.setValue(101);
    expect(capControl.valid).toBeFalsy();
    expect(capControl.hasError('max')).toBeTruthy();
  });

  it('debe invalidar el formulario si el tope es negativo', () => {
    const capControl = component.configForm.controls['cap_percentage'];
    
    capControl.setValue(-5);
    expect(capControl.valid).toBeFalsy();
    expect(capControl.hasError('min')).toBeTruthy();
  });

  it('debe aceptar un tope válido (ej: 0% o 100%)', () => {
    const capControl = component.configForm.controls['cap_percentage'];
    
    capControl.setValue(0);
    expect(capControl.valid).toBeTruthy();

    capControl.setValue(100);
    expect(capControl.valid).toBeTruthy();
  });

  // ::: Batch 4 : Lógica de guardado ( integración del componente):::

  it('NO debe guardar si el formulario es inválido y debe marcar los campos como tocados', () => {
    // 1. Función del mock
    const spyCreate = vi.spyOn(mockConfigService, 'createConfig');
    // 2. Se fuerza un error (Tope = 150%)
    component.configForm.controls['cap_percentage'].setValue(150);
    // 3. Intento de  guardardo
    component.saveConfig();
    // 4. Verificación de que el servicio no se llamó para evitar enviar datos a la BD
    expect(spyCreate).not.toHaveBeenCalled();
    // 5. Comprobación que se marcó como "touched" para que el HTML lo muestre las letras rojas
    expect(component.configForm.controls['cap_percentage'].touched).toBeTruthy();
  });

  it('debe llamar al servicio de guardado si los datos son correctos', () => {
    const spyCreate = vi.spyOn(mockConfigService, 'createConfig').mockReturnValue(of({}));
    const spyLoad = vi.spyOn(component, 'loadConfigs');
    const spyCloseModal = vi.spyOn(component, 'closeEditModal');

    // 1. Cargar datos válidos
    component.configForm.controls['hour_value'].setValue(6000);
    component.configForm.controls['cap_percentage'].setValue(35);

    // 2. Guardar
    component.saveConfig();

    // 3. Comprobar la automatización del flujo
    expect(spyCreate).toHaveBeenCalledWith({
      hour_value: '6000',
      cap_percentage: '35'
    });
    expect(spyLoad).toHaveBeenCalled(); // Verificar que recargue la tabla
    expect(spyCloseModal).toHaveBeenCalled(); // Verificar que cierre el modal
  });
});