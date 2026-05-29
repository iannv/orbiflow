import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { LiquidationService } from '../../../services/liquidation-service';
import { AssociateService } from '../../../services/associate-service'; 
import { LiquidationPeriod } from '../../../interfaces/Liquidation';


// Componentes de OrbiFlow
import { Modal } from '../../../components/modal/modal';
import { Toast } from '../../../components/toast/toast';
import { Primary } from '../../../components/button/primary/primary';

@Component({
  selector: 'app-pre-liquidation',
  standalone: true,
  imports: [CommonModule, FormsModule, Modal, Toast, Primary],
  templateUrl: './pre-liquidation.html',
  styleUrls: ['./pre-liquidation.css']
})
export class PreLiquidationComponent implements OnInit {
  periods: LiquidationPeriod[] = [];
  selectedPeriodId: number | null = null;
  
  associates: any[] = [];
  hoursData: { [associateId: number]: number } = {};
  
  diasHabiles: number = 20; 
  simulationResults: any[] = []; 
  selectedSimulationDetail: any = null; 
  dataLoaded: boolean = false; 

  //  Estados de los Modales Propios 
  isCreateModalOpen = false;
  isRevisionModalOpen = false;

  //  Estados del Toast
  mostrarToast = false;
  toastTitle = '';
  toastSubtitle = '';

  // Variables para la creación del periodo
  newPeriodMonth: number = new Date().getMonth() + 1;
  newPeriodYear: number = new Date().getFullYear();
  globalHourValue: string = '0.00';
  globalCapPct: string = '30.00';

  mesesDisponibles = [
    { valor: 1, nombre: 'Enero' }, { valor: 2, nombre: 'Febrero' },
    { valor: 3, nombre: 'Marzo' }, { valor: 4, nombre: 'Abril' },
    { valor: 5, nombre: 'Mayo' }, { valor: 6, nombre: 'Junio' },
    { valor: 7, nombre: 'Julio' }, { valor: 8, nombre: 'Agosto' },
    { valor: 9, nombre: 'Septiembre' }, { valor: 10, nombre: 'Octubre' },
    { valor: 11, nombre: 'Noviembre' }, { valor: 12, nombre: 'Diciembre' }
  ];

  constructor(
    private liquidationService: LiquidationService,
    private associateService: AssociateService,
    private cdr: ChangeDetectorRef,
    private router: Router
  ) {}

  ngOnInit() {
    this.loadOpenPeriods();
  }
  
  // Control de Modales
  openCreateModal() {
    this.newPeriodMonth = new Date().getMonth() + 1;
    this.newPeriodYear = new Date().getFullYear();

    this.liquidationService.getGlobalConfig().subscribe({
      next: (config: any) => {
        const activeConfig = Array.isArray(config) ? config[0] : config;
        if (activeConfig) {
          this.globalHourValue = activeConfig.hour_value || '0.00';
          this.globalCapPct = activeConfig.cap_pct || '30.00'; 
        }
        this.isCreateModalOpen = true; 
        this.cdr.detectChanges();
      },
      error: (err: any) => {
        console.error("Error global:", err);
        this.lanzarToast('Error', 'No se pudo cargar la configuración global.');
      }
    });
  }

  closeCreateModal() {
    this.isCreateModalOpen = false;
  }

  openRevisionModal(associateId: number) {
    this.selectedSimulationDetail = this.getSimulationForAssociate(associateId);
    this.isRevisionModalOpen = true;
    this.cdr.detectChanges();
  }

  closeRevisionModal() {
    this.isRevisionModalOpen = false;
  }

  // Lógica de Negocio
  isYearValid(): boolean {
    return this.newPeriodYear !== null && 
           this.newPeriodYear !== undefined && 
           this.newPeriodYear >= 2000 && 
           this.newPeriodYear <= 2100;
  }

  onCreatePeriod() {
    
    if (!this.isYearValid()) {
      this.lanzarToast('Dato Incorrecto', 'Por favor, ingrese un año válido de 4 cifras.');
      return; 
    }

    const payload = {
      month: this.newPeriodMonth,
      year: this.newPeriodYear,
      applied_hour_value: this.globalHourValue,
      applied_cap_pct: this.globalCapPct,
      status: 'open' as const
    };

    this.liquidationService.createPeriod(payload).subscribe({
      next: (created: LiquidationPeriod) => {
        this.lanzarToast('Periodo Creado', `Periodo ${created.month}/${created.year} guardado correctamente.`);
        this.loadOpenPeriods(); 
        this.closeCreateModal(); 
        this.cdr.detectChanges();
      },
      error: (err: any) => {
        console.error("Error al crear:", err);
        this.lanzarToast('Error', 'No se pudo crear. Verifique si el periodo ya existe.');
      }
    });
  }


  getSelectedPeriodParams() {
    return this.periods.find(p => p.id === Number(this.selectedPeriodId));
  }

  loadOpenPeriods() {
    this.liquidationService.getPeriods('open').subscribe({
      next: (res) => {
        this.periods = res;
        this.cdr.detectChanges(); 
      },
      error: (err) => console.error("Error al cargar periodos.", err)
    });
  }

  onLoadData() {
    if (!this.selectedPeriodId) return;
    
    this.associateService.getAssociates().subscribe({
      next: (res) => {
        this.associates = res;
        this.associates.forEach(a => this.hoursData[a.id] = 0);
        this.dataLoaded = true;
        this.simulationResults = []; 
        this.cdr.detectChanges(); 
      },
      error: (err) => console.error("Error al cargar socios.", err)
    });
  }

  autoCompleteHours() {
    if (!this.diasHabiles) return;
    this.associates.forEach(assoc => {
      this.hoursData[assoc.id] = (assoc.base_hours ?? 8) * this.diasHabiles;
    });
    this.cdr.detectChanges(); 
  }

  onSimulate() {
    const payload = {
      entries: this.associates.map(a => ({
        associate_id: a.id,
        hours_worked: this.hoursData[a.id] || 0
      }))
    };

    this.liquidationService.uploadHours(this.selectedPeriodId!, payload).subscribe(() => {
      this.liquidationService.calculate(this.selectedPeriodId!, true).subscribe(result => {
        this.simulationResults = result.retirements || result; 
        this.cdr.detectChanges(); 
      });
    });
  }

  getSimulationForAssociate(associateId: number) {
    if (!this.simulationResults.length) return null;
    return this.simulationResults.find(r => r.associate_id === associateId);
  }

  getAssociateName(associateId: number): string {
    const associate = this.associates.find(a => a.id === associateId);
    return associate ? associate.full_name : `Socio #${associateId}`;
  }

  onMarkAsReviewed() {
    this.liquidationService.updatePeriodStatus(this.selectedPeriodId!, 'reviewed').subscribe(() => {
      this.lanzarToast('Revisión Aprobada', 'El periodo se ha marcado como REVISADO.');
      this.loadOpenPeriods(); 
      this.dataLoaded = false;
      this.selectedPeriodId = null;
      this.cdr.detectChanges(); 

      setTimeout(() => {
    this.router.navigate(['/liquidaciones']); 
  }, 3500);
    });
  }


  lanzarToast(titulo: string, subtitulo: string): void {
    this.toastTitle = titulo;
    this.toastSubtitle = subtitulo;
    this.mostrarToast = true;
    this.cdr.detectChanges();

    setTimeout(() => {
      this.mostrarToast = false;
      this.cdr.detectChanges();
    }, 3500);
  }
}