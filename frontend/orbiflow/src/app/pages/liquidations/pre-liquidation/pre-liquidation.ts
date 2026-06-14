import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { LiquidationService } from '../../../services/liquidation-service';
import { AssociateService } from '../../../services/associate-service'; 
import { LiquidationPeriod } from '../../../interfaces/Liquidation';
import { formatCurrency } from '../../../shared/utils/formatCurrency';
import { formatPercentage } from '../../../shared/utils/formatPercentage';

// Componentes de OrbiFlow
import { Modal } from '../../../components/modal/modal';
import { Toast } from '../../../components/toast/toast';
import { Primary } from '../../../components/button/primary/primary';
import { Loader } from '../../../components/loader/loader';

@Component({
  selector: 'app-pre-liquidation',
  standalone: true,
  imports: [CommonModule, FormsModule, Modal, Toast, Primary, Loader],
  templateUrl: './pre-liquidation.html',
  styleUrls: ['./pre-liquidation.css']
})
export class PreLiquidationComponent implements OnInit {
  periods: LiquidationPeriod[] = [];
  selectedPeriodId: number | null = null;
  
  associates: any[] = [];
  hoursData: { [associateId: number]: number } = {};
  
  // sirve para el seguimiento de los asociados que se enviarán a la simulación y al guardado final
  selectedAssociates: { [associateId: number]: boolean } = {};
  
  diasHabiles: number = 20; 
  simulationResults: any[] = []; 
  selectedSimulationDetail: any = null; 
  dataLoaded: boolean = false;
  isLoadingData = false;

  //  Bloqueo de peticiones en paralelo
  isProcessing = false; 
  private toastTimeoutId: any;

  // Estados de los Modales Propios 
  isCreateModalOpen = false;
  isRevisionModalOpen = false;
  isConfirmModalOpen = false; 
  isApproveModalOpen = false; 

  // Estados del Toast
  mostrarToast = false;
  toastTitle = '';
  toastSubtitle = '';

  // Variables para la creación del periodo
  newPeriodMonth: number = new Date().getMonth() + 1;
  newPeriodYear: number = new Date().getFullYear();
  globalHourValue: string = '0.00';
  globalCapPct: string = '30.00';

  //Utilidades
  formatCurrency = formatCurrency;
  formatPercentage = formatPercentage;

  mesesDisponibles = [
    { valor: 1, nombre: 'Enero' }, { valor: 2, nombre: 'Febrero' },
    { valor: 3, nombre: 'Marzo' }, { valor: 4, nombre: 'Abril' },
    { valor: 5, nombre: 'Mayo' }, { valor: 6, nombre: 'Junio' },
    { valor: 7, nombre: 'Julio' }, { valor: 8, nombre: 'Agosto' },
    { valor: 9, nombre: 'Septiembre' }, { valor: 10, nombre: 'Octubre' },
    { valor: 11, nombre: 'Noviembre' }, { valor: 12, nombre: 'Diciembre' }
  ];

  private pendingPeriodId: number | null = null;

  constructor(
    private liquidationService: LiquidationService,
    private associateService: AssociateService,
    private cdr: ChangeDetectorRef,
    private router: Router,
    private route: ActivatedRoute,
  ) {}

  ngOnInit() {
    this.route.queryParams.subscribe((params) => {
      this.pendingPeriodId = params['periodId'] ? Number(params['periodId']) : null;
      this.loadOpenPeriods();
    });
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
          this.globalCapPct = activeConfig.cap_percentage || '30.00'; 
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
           this.newPeriodYear >= 1900 && 
           this.newPeriodYear <= 2999;
  }

  onCreatePeriod() {
    if (!this.isYearValid()) {
      this.lanzarToast('Dato Incorrecto', 'Por favor, ingrese un año válido de 4 cifras.');
      return; 
    }

    // Bloqueo de peticiones dobles
    if (this.isProcessing) return;
    this.isProcessing = true;

    const payload = {
      month: this.newPeriodMonth,
      year: this.newPeriodYear,
      status: 'open' as const
    };

    this.liquidationService.createPeriod(payload).subscribe({
      next: (created: LiquidationPeriod) => {
        this.lanzarToast('Periodo Creado', `Periodo ${created.month}/${created.year} guardado correctamente.`);
        this.loadOpenPeriods(); 
        this.closeCreateModal(); 
        this.isProcessing = false; 
        this.cdr.detectChanges();
      },
      error: (err: any) => {
        console.error("Error al crear:", err);
        this.lanzarToast('Error', 'No se pudo crear. Verifique si el periodo ya existe.');
        this.isProcessing = false; 
        this.cdr.detectChanges();
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
        if (this.pendingPeriodId && res.some((p) => p.id === this.pendingPeriodId)) {
          this.selectedPeriodId = this.pendingPeriodId;
          this.onLoadData();
        }
        this.cdr.detectChanges();
      },
      error: (err) => console.error('Error al cargar periodos.', err),
    });
  }

  // Limpia la vista cuando se elige un periodo distinto
  onPeriodChange() {
    this.dataLoaded = false;
    this.associates = [];
    this.simulationResults = [];
    if (this.selectedPeriodId) {
      this.onLoadData();
    } else {
      this.cdr.detectChanges();
    }
  }

  onLoadData() {
    if (!this.selectedPeriodId || this.isLoadingData) return;

    const currentPeriod = this.getSelectedPeriodParams();
    if (!currentPeriod) return;

    const periodId = Number(this.selectedPeriodId);
    this.isLoadingData = true;
    this.dataLoaded = false;

    this.associateService.getAssociates().subscribe({
      next: (res) => {
        // Filtrado por Fecha de Alta
        this.associates = res.filter((assoc: any) => {
          if (!assoc.entry_date) return true;
          const [yearStr, monthStr] = assoc.entry_date.split('-');
          const entryYear = parseInt(yearStr, 10);
          const entryMonth = parseInt(monthStr, 10);
          return entryYear < currentPeriod.year ||
                 (entryYear === currentPeriod.year && entryMonth <= currentPeriod.month);
        });

        this.liquidationService.getRetirementsByLiquidation(periodId).subscribe({
          next: (retirements) => {
            const savedHours: { [associateId: number]: number } = {};
            retirements.forEach((r: any) => {
              savedHours[r.associate] = r.hours_worked;
            });
            const hasSavedData = retirements.length > 0;

            this.associates.forEach((a) => {
              if (hasSavedData) {
                this.selectedAssociates[a.id] = savedHours[a.id] !== undefined;
                this.hoursData[a.id] = savedHours[a.id] ?? 0;
              } else {
                this.selectedAssociates[a.id] = true;
                this.hoursData[a.id] = 0;
              }
            });

            this.dataLoaded = true;
            this.simulationResults = [];
            this.isLoadingData = false;
            this.cdr.detectChanges();
          },
          error: (err) => {
            console.error('Error al cargar horas guardadas.', err);
            this.associates.forEach((a) => {
              this.hoursData[a.id] = 0;
              this.selectedAssociates[a.id] = true;
            });
            this.dataLoaded = true;
            this.simulationResults = [];
            this.isLoadingData = false;
            this.cdr.detectChanges();
          },
        });
      },
      error: (err) => {
        console.error('Error al cargar socios.', err);
        this.isLoadingData = false;
        this.cdr.detectChanges();
      },
    });
  }

  autoCompleteHours() {
    if (!this.diasHabiles) return;
    this.associates.forEach(assoc => {
      // autocompleta horas de los asociados tildados
      if (this.selectedAssociates[assoc.id]) {
        this.hoursData[assoc.id] = (assoc.base_hours ?? 8) * this.diasHabiles;
      }
    });
    this.cdr.detectChanges(); 
  }

  onSimulate() {
    const entries = this.associates
      .filter(a => this.selectedAssociates[a.id])
      .map(a => ({
        associate_id: a.id,
        hours_worked: this.hoursData[a.id] || 0
      }));

    if (entries.length === 0) {
      this.lanzarToast('Aviso', 'Seleccione al menos un asociado para simular.');
      return;
    }

    // Bloqueo de peticiones dobles
    if (this.isProcessing) return;
    this.isProcessing = true;

    const payload = { entries };

    this.liquidationService.simulateLiquidation(this.selectedPeriodId!, payload).subscribe({
      next: (result: any) => {
        this.simulationResults = result.retirements || result; 
        this.isProcessing = false;
        this.cdr.detectChanges(); 
      },
      error: (err: any) => {
        console.error(err);
        this.lanzarToast('Error', 'Hubo un error al generar la simulación.');
        this.isProcessing = false;
        this.cdr.detectChanges();
      }
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

  get allAssociatesSelected(): boolean {
    return (
      this.associates.length > 0 &&
      this.associates.every((a) => this.selectedAssociates[a.id])
    );
  }

  get someAssociatesSelected(): boolean {
    const selected = this.associates.filter((a) => this.selectedAssociates[a.id]).length;
    return selected > 0 && selected < this.associates.length;
  }

  toggleSelectAll(): void {
    const selectAll = !this.allAssociatesSelected;
    this.associates.forEach((a) => {
      this.selectedAssociates[a.id] = selectAll;
    });
    this.cdr.detectChanges();
  }

  onMarkAsReviewed() {
    this.isApproveModalOpen = true;
    this.cdr.detectChanges();
  }

  confirmApproveReview() {
    // Bloqueo de peticiones dobles
    if (this.isProcessing) return;
    this.isProcessing = true;

    // payload final con los asociados tildados definitivos
    const entries = this.associates
      .filter(a => this.selectedAssociates[a.id])
      .map(a => ({
        associate_id: a.id,
        hours_worked: this.hoursData[a.id] || 0
      }));

    const payload = { entries };

    // se guardan las horas a la base de datos de forma definitiva
    this.liquidationService.uploadHours(this.selectedPeriodId!, payload).subscribe({
      next: () => {
        // si se guardaron bien, se cambia el estado del periodo
        this.liquidationService.updatePeriodStatus(this.selectedPeriodId!, 'reviewed').subscribe({
          next: () => {
            this.lanzarToast('Revisión Aprobada', 'El periodo se ha marcado como REVISADO.');
            this.loadOpenPeriods(); 
            this.dataLoaded = false;
            this.selectedPeriodId = null;
            this.isApproveModalOpen = false; 
            this.isProcessing = false; 
            this.cdr.detectChanges(); 

            setTimeout(() => {
              this.router.navigate(['/liquidaciones']); 
            }, 3500);
          },
          error: (err: any) => {
            console.error(err);
            this.lanzarToast('Error', 'No se pudo actualizar el estado del periodo.');
            this.isApproveModalOpen = false;
            this.isProcessing = false;
            this.cdr.detectChanges();
          }
        });
      },
      error: (err: any) => {
        console.error(err);
        this.lanzarToast('Error', 'No se pudieron guardar las horas definitivas.');
        this.isApproveModalOpen = false;
        this.isProcessing = false; 
        this.cdr.detectChanges();
      }
    });
  }

  // Resetea la vista para poder volver a modificar
  onCorregirHoras() {
    this.simulationResults = [];
    this.cdr.detectChanges();
  }

  // Permite borrar el periodo en caso de haberse creado por error
  onEliminarPeriodo() {
    this.isConfirmModalOpen = true;
    this.cdr.detectChanges();
  }

  confirmarEliminacionPeriodo() {
    // Bloqueo de peticiones dobles
    if (this.isProcessing) return;
    this.isProcessing = true;

    this.liquidationService.deletePeriod(this.selectedPeriodId!).subscribe({
      next: () => {
        this.lanzarToast('Periodo Descartado', 'Se ha eliminado el periodo.');
        this.selectedPeriodId = null;
        this.dataLoaded = false;
        this.isConfirmModalOpen = false;
        this.isProcessing = false; 
        this.loadOpenPeriods();
        this.cdr.detectChanges();
      },
      error: (err: any) => {
        console.error(err);
        this.lanzarToast('Error', 'No se pudo descartar el periodo.');
        this.isConfirmModalOpen = false;
        this.isProcessing = false;
        this.cdr.detectChanges();
      }
    });
  }

  lanzarToast(titulo: string, subtitulo: string): void {
    this.toastTitle = titulo;
    this.toastSubtitle = subtitulo;
    this.mostrarToast = true;
    this.cdr.detectChanges();

    //  Evitar que alertas consecutivas se oculten antes de tiempo
    if (this.toastTimeoutId) {
      clearTimeout(this.toastTimeoutId);
    }

    this.toastTimeoutId = setTimeout(() => {
      this.mostrarToast = false;
      this.cdr.detectChanges();
    }, 3500);
  }
}