import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ConfiguracionService, GlobalConfig } from '../../services/configuracion-service';
import { BaseCard } from '../../components/base-card/base-card';
import { Action } from '../../components/button/action/action';
import { Primary } from '../../components/button/primary/primary';
import { Modal } from '../../components/modal/modal';

type EditMode = 'hour' | 'cap' | 'both';

@Component({
  selector: 'app-configuracion-general',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, BaseCard, Action, Primary, Modal],
  templateUrl: './configuracion-general.html',
  styleUrl: './configuracion-general.css'
})
export class ConfiguracionGeneral implements OnInit {
  private readonly configService = inject(ConfiguracionService);
  private readonly fb = inject(FormBuilder);

  // Estados
  configs = signal<GlobalConfig[]>([]);
  currentConfig = signal<GlobalConfig | null>(null);
  lastModification = signal<GlobalConfig | null>(null); 
  isLoading = signal<boolean>(true);

  // Control de Modales
  isEditModalOpen = signal(false);
  isHistoryModalOpen = signal(false);
  editingField = signal<EditMode>('both');
  modalTitle = signal('');
  
  // Formulario Reactivo
  configForm: FormGroup = this.fb.group({
    hour_value: [0, [Validators.required, Validators.min(1)]],
    cap_percentage: [0, [Validators.required, Validators.min(0), Validators.max(100)]]
  });

  ngOnInit() {
    this.loadConfigs();
  }

  loadConfigs() {
    this.isLoading.set(true);
    this.configService.getConfigs().subscribe({
      next: (data) => {
        this.configs.set(data);
        if (data.length > 0) {
          this.currentConfig.set(data[0]);
          this.lastModification.set(data[0]);
        } else {
          this.currentConfig.set(null);
          this.lastModification.set(null);
        }
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Error al cargar configuraciones', err);
        this.isLoading.set(false);
      }
    });
  }

  // --- Lógica del Modal de Edición ---
  openEditModal(mode: EditMode) {
    this.editingField.set(mode);
    const current = this.currentConfig();

    this.configForm.patchValue({
      hour_value: current ? Number(current.hour_value) : 0,
      cap_percentage: current ? Number(current.cap_percentage) : 0
    });

    if (mode === 'hour') this.modalTitle.set('Editar Valor Hora');
    else if (mode === 'cap') this.modalTitle.set('Editar Tope de Adicionales');
    else this.modalTitle.set('Configuración Inicial');

    this.isEditModalOpen.set(true);
  }

  closeEditModal() {
    this.isEditModalOpen.set(false);
    this.configForm.reset();
  }

  saveConfig() {
    if (this.configForm.invalid) {
      this.configForm.markAllAsTouched(); 
      return; 
    }

    const payload = {
      hour_value: this.configForm.value.hour_value.toString(),
      cap_percentage: this.configForm.value.cap_percentage.toString()
    };

    this.configService.createConfig(payload).subscribe({
      next: () => {
        this.loadConfigs(); 
        this.closeEditModal();
      },
      error: (err) => {
        console.error('Error guardando configuración', err);
      }
    });
  }

  // --- Lógica del Modal de Historial ---
  openHistoryModal() {
    this.isHistoryModalOpen.set(true);
  }

  closeHistoryModal() {
    this.isHistoryModalOpen.set(false);
  }
}