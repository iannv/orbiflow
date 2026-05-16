import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormArray, Validators, ReactiveFormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';

import { ModulosService } from '../../services/modulos-service';
import { Modulo } from '../../interfaces/Modulo';

import { BaseCard } from '../../components/base-card/base-card';
import { Primary } from '../../components/button/primary/primary';
import { Action } from '../../components/button/action/action';
import { Chip } from '../../components/chip/chip';
import { Modal } from '../../components/modal/modal';
import { Toast } from '../../components/toast/toast';

@Component({
  selector: 'app-modulos',
  standalone: true,
  imports: [
    CommonModule, 
    ReactiveFormsModule, 
    BaseCard, 
    Primary, 
    Action, 
    Chip, 
    Modal,
    Toast 
  ],
  templateUrl: './modulos.html',
  styleUrl: './modulos.css',
})
export class Modulos implements OnInit {
  modulosList: Modulo[] = [];
  moduloForm!: FormGroup;
  
  // Estados de Modales
  isModalOpen = false;
  isConfirmModalOpen = false;
  
  // Variables de control
  moduloEnEdicion: Modulo | null = null;
  moduloAEliminarId: number | undefined = undefined;

  // Estados del Toast
  mostrarToast = false;
  toastTitle = '';
  toastSubtitle = '';

  private modulosService = inject(ModulosService);
  private fb = inject(FormBuilder);
  private cdr = inject(ChangeDetectorRef);

  ngOnInit(): void {
    this.initForm();
    this.cargarModulos();
  }

  private initForm(): void {
    this.moduloForm = this.fb.group({
      name: ['', Validators.required],
      description: [''],
      calculation_type: ['simple', Validators.required],
      is_exclusive: [true],
      applies_to_cap: [false],
      is_active: [true],
      variants: this.fb.array([])
    });
  }

  get variantesFormArray(): FormArray {
    return this.moduloForm.get('variants') as FormArray;
  }

  agregarVariante(): void {
    const varianteGroup = this.fb.group({
      id: [null],
      name: ['', Validators.required],
      type: ['fixed_amount', Validators.required],
      value: ['', [Validators.required, Validators.min(0)]],
      is_default: [false]
    });
    this.variantesFormArray.push(varianteGroup);
  }

  eliminarVariante(index: number): void {
    this.variantesFormArray.removeAt(index);
  }

  cargarModulos(): void {
    this.modulosService.getModulos().subscribe({
      next: (data) => {
        this.modulosList = data;
        this.cdr.detectChanges(); 
      },
      error: (err) => console.error('Error al cargar módulos', err)
    });
  }

  // --- LÓGICA DE MODALES Y FORMULARIOS ---

  openModal(): void {
    this.moduloEnEdicion = null;
    this.moduloForm.reset({ 
      calculation_type: 'simple', 
      is_exclusive: true,
      applies_to_cap: false,
      is_active: true 
    });
    this.variantesFormArray.clear();
    this.isModalOpen = true;
  }

  editarModulo(modulo: Modulo): void {
    this.moduloEnEdicion = modulo; 
    this.moduloForm.patchValue({
      name: modulo.name,
      description: modulo.description,
      calculation_type: modulo.calculation_type,
      is_exclusive: modulo.is_exclusive,
      applies_to_cap: modulo.applies_to_cap,
      is_active: modulo.is_active
    });

    this.variantesFormArray.clear();
    if (modulo.variants) {
      modulo.variants.forEach(variante => {
        this.variantesFormArray.push(this.fb.group({
          id: [variante.id],
          name: [variante.name, Validators.required],
          type: [variante.type, Validators.required],
          value: [variante.value, [Validators.required, Validators.min(0)]],
          is_default: [variante.is_default]
        }));
      });
    }
    this.isModalOpen = true;
  }

  closeModal(): void {
    this.isModalOpen = false;
  }

  guardarModulo(): void {
    if (this.moduloForm.invalid) {
      this.moduloForm.markAllAsTouched();
      this.lanzarToast('Formulario incompleto', 'Por favor, complete todos los campos obligatorios.');
      return;
    }


    const datosModulo = { ...this.moduloForm.value };

    if (datosModulo.variants && datosModulo.variants.length > 0) {
      datosModulo.variants = datosModulo.variants.map((v: any) => {
        if (v.id === null || v.id === undefined) {
          delete v.id;
        }
        return v;
      });
    }

    if (this.moduloEnEdicion && this.moduloEnEdicion.id) {
      // Actualizar existente
      this.modulosService.updateModulo(this.moduloEnEdicion.id, datosModulo).subscribe({
        next: () => {
          this.lanzarToast('Módulo actualizado', 'Los cambios se guardaron correctamente.');
          this.closeModal();
          this.cargarModulos(); 
          this.cdr.detectChanges(); 
        },
        error: (err: HttpErrorResponse) => {
          console.error('Error al actualizar', err);
          const msj = this.extraerMensajeError(err);
          this.lanzarToast('Error al guardar', msj);
          this.cdr.detectChanges(); 
        }
      });
    } else {
      // Crear nuevo
      this.modulosService.createModulo(datosModulo).subscribe({
        next: () => {
          this.lanzarToast('Módulo guardado', 'El nuevo concepto se registró en el sistema.');
          this.closeModal();
          this.cargarModulos();
          this.cdr.detectChanges(); 
        },
        error: (err: HttpErrorResponse) => {
          console.error('Error al crear', err);
          const msj = this.extraerMensajeError(err);
          this.lanzarToast('Error al crear', msj);
          this.cdr.detectChanges(); 
        }
      });
    }
  }

  private extraerMensajeError(err: HttpErrorResponse): string {
    if (err.error && typeof err.error === 'object') {
      const errores = Object.values(err.error).flat();
      if (errores.length > 0) return String(errores[0]);
    }
    return 'Hubo un problema de conexión con el servidor.';
  }

  // --- LÓGICA DE ELIMINACIÓN ---

  confirmarEliminacion(id: number | undefined): void {
    if (!id) return;
    this.moduloAEliminarId = id;
    this.isConfirmModalOpen = true;
  }

  eliminarModuloDefinitivo(): void {
    if (!this.moduloAEliminarId) return;
    
    this.modulosService.deleteModulo(this.moduloAEliminarId).subscribe({
      next: () => {
        this.lanzarToast('Módulo eliminado', 'El registro ha sido borrado permanentemente.');
        this.isConfirmModalOpen = false;
        this.moduloAEliminarId = undefined;
        this.cargarModulos();
        this.cdr.detectChanges(); // <-- Forzar renderizado
      },
      error: (err) => {
        console.error('Error al eliminar', err);
        this.lanzarToast('Error de eliminación', 'No se puede borrar un módulo que está en uso.');
        this.isConfirmModalOpen = false;
        this.cdr.detectChanges(); // <-- Forzar renderizado
      }
    });
  }

  // --- FEEDBACK VISUAL ---

  toggleEstadoModulo(event: Event, modulo: Modulo): void {
    const checkbox = event.target as HTMLInputElement;
    const nuevoEstado = checkbox.checked;
    
    if (!modulo.id) return;

  
    this.modulosService.updateModulo(modulo.id, { is_active: nuevoEstado }).subscribe({
      next: () => {
      
        modulo.is_active = nuevoEstado;
        this.lanzarToast('Estado actualizado', `El módulo "${modulo.name}" ahora está ${nuevoEstado ? 'activo' : 'inactivo'}.`);
        this.cdr.detectChanges();
      },
      error: (err: HttpErrorResponse) => {
        console.error('Error al cambiar el estado', err);
  
        checkbox.checked = !nuevoEstado; 
        const msj = this.extraerMensajeError(err);
        this.lanzarToast('Error al actualizar', msj);
        this.cdr.detectChanges();
      }
    });
  }

  lanzarToast(titulo: string, subtitulo: string): void {
    this.toastTitle = titulo;
    this.toastSubtitle = subtitulo;
    this.mostrarToast = true;
    this.cdr.detectChanges(); 
    
    // Ocultar automáticamente 
    setTimeout(() => {
      this.mostrarToast = false;
      this.cdr.detectChanges(); 
    }, 3500);
  }
}