import { Component, OnInit, inject, ChangeDetectorRef, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { LiquidationService } from '../../../services/liquidation-service';
import { LiquidationPeriod, LiquidationSummary } from '../../../interfaces/Liquidation';
import { AssociateService } from '../../../services/associate-service';
import { formatCurrency } from '../../../shared/utils/formatCurrency';
import { formatPercentage } from '../../../shared/utils/formatPercentage';

import { Modal } from '../../../components/modal/modal';
import { Toast } from '../../../components/toast/toast';
import { Loader } from '../../../components/loader/loader';

@Component({
  selector: 'app-liquidation',
  standalone: true,
  imports: [CommonModule, FormsModule, Modal, Toast, Loader],
  templateUrl: './liquidation.html',
  styleUrls: ['./liquidation.css']
})
export class LiquidationComponent implements OnInit {
  reviewedPeriods: LiquidationPeriod[] = [];
  selectedPeriodId: number | null = null;
  summary: LiquidationSummary | null = null;
  associatesMap: { [id: number]: string } = {};
  
  associatesCalculations: any[] = [];
  selectedDetail: any = null;

  // Prevención de transacciones duplicadas
  isProcessing = false;
  isLoadingData = false;
  private toastTimeoutId: any;

  isConfirmModalOpen = false;
  isRevertModalOpen = false;
  isDetailsModalOpen = false;

  mostrarToast = false;
  toastTitle = '';
  toastSubtitle = '';

  //utilidades
  formatCurrency = formatCurrency;
  formatPercentage = formatPercentage;

  private liquidationService = inject(LiquidationService);
  private cdr = inject(ChangeDetectorRef);
  private ngZone = inject(NgZone); 
  private associateService = inject(AssociateService);
  private router = inject(Router);

  ngOnInit() {
    this.loadReviewedPeriods();
    this.cargarMapaAsociados();
  }

  loadReviewedPeriods() {
    this.liquidationService.getPeriods('reviewed').subscribe({
      next: (res) => {
        this.ngZone.run(() => {
          this.reviewedPeriods = res;
          this.cdr.detectChanges(); 
        });
      },
      error: (err) => console.error('Error al cargar periodos en revisión', err)
    });
  }

  cargarMapaAsociados() {
    this.associateService.getAssociates().subscribe(data => {
      this.ngZone.run(() => {
        data.forEach(assoc => {
          this.associatesMap[assoc.id] = assoc.full_name;
        });
        this.cdr.detectChanges(); 
      });
    });
  }
  
  getAssociateName(id: number): string {
    return this.associatesMap[id] || `Socio #${id}`;
  }

  onPeriodChange() {
    this.summary = null;
    this.associatesCalculations = [];
    if (this.selectedPeriodId) {
      this.onLoadData();
    } else {
      this.cdr.detectChanges();
    }
  }

  onLoadData() {
    if (!this.selectedPeriodId) return;
    if (this.isLoadingData || this.isProcessing) return;

    this.isLoadingData = true;
    this.summary = null;
    this.associatesCalculations = [];
    
    const periodId = Number(this.selectedPeriodId); 

    this.liquidationService.calculate(periodId, true).subscribe({
      next: (result) => {
        this.ngZone.run(() => {
          this.associatesCalculations = result.retirements || result;

          let totalBase = 0;
          let totalAdditional = 0;
          let totalCap = 0;
          let totalFinal = 0;

          this.associatesCalculations.forEach(item => {
            totalBase += parseFloat(item.base_amount || '0');
            totalAdditional += parseFloat(item.additional_amount || '0');
            totalCap += parseFloat(item.cap_adjustment || '0');
            totalFinal += parseFloat(item.total_amount || '0');
          });

          this.summary = {
            period: this.reviewedPeriods.find(p => p.id === periodId)!,
            retirements_count: this.associatesCalculations.length,
            retirements: this.associatesCalculations,
            totals: {
              base_amount: totalBase.toFixed(2),
              additional_amount: totalAdditional.toFixed(2),
              cap_adjustment: totalCap.toFixed(2),
              total_amount: totalFinal.toFixed(2)
            }
          };

          this.isLoadingData = false;
          this.cdr.detectChanges(); 
        });
      },
      error: (err) => {
        console.error('Error al previsualizar cálculos', err);
        this.lanzarToast('Error', 'No se pudieron simular los detalles.');
        this.isLoadingData = false;
        this.cdr.detectChanges();
      }
    });
  }

  openConfirmModal() {
    if (!this.selectedPeriodId) return;
    this.isConfirmModalOpen = true;
  }

  closeConfirmModal() {
    this.isConfirmModalOpen = false;
  }

  openRevertModal() {
    if (!this.selectedPeriodId) return;
    this.isRevertModalOpen = true;
  }

  closeRevertModal() {
    this.isRevertModalOpen = false;
  }

  onConfirmRevert() {
    if (!this.selectedPeriodId || this.isProcessing) return;

    this.isProcessing = true;
    const periodId = Number(this.selectedPeriodId);

    this.liquidationService.updatePeriodStatus(periodId, 'open').subscribe({
      next: () => {
        this.ngZone.run(() => {
          this.isRevertModalOpen = false;
          this.isProcessing = false;
          this.lanzarToast(
            'Período reabierto',
            'El período volvió a pre-liquidación. Podés corregir las horas y marcarlo como revisado nuevamente.',
          );
          setTimeout(() => {
            this.router.navigate(['/liquidaciones/pre-liquidation'], {
              queryParams: { periodId },
            });
          }, 1500);
        });
      },
      error: (err) => {
        console.error('Error al devolver el periodo', err);
        this.lanzarToast('Error', 'No se pudo devolver el período a pre-liquidación.');
        this.isProcessing = false;
        this.isRevertModalOpen = false;
      },
    });
  }

  openDetailsModal(calcItem: any) {
    this.selectedDetail = calcItem;
    this.isDetailsModalOpen = true;
    this.cdr.detectChanges();
  }

  closeDetailsModal() {
    this.isDetailsModalOpen = false;
    this.selectedDetail = null;
  }

  onConfirmClose() {
    if (!this.selectedPeriodId) return;
    
    // Bloqueo  de transacciones dobles
    if (this.isProcessing) return;
    this.isProcessing = true;
    
    const periodId = Number(this.selectedPeriodId);
    
    this.liquidationService.calculate(periodId, false).subscribe({
      next: () => {
        this.liquidationService.updatePeriodStatus(periodId, 'closed').subscribe({
          next: () => {
            this.ngZone.run(() => {
              this.isConfirmModalOpen = false;
              this.summary = null;
              this.associatesCalculations = [];
              this.selectedPeriodId = null;
              this.isProcessing = false; 
              
              this.lanzarToast('Cierre Exitoso', 'La liquidación se consolidó de manera inmutable.');
              
              this.loadReviewedPeriods(); 

              setTimeout(() => {
                this.router.navigate(['/liquidaciones']); 
              }, 3500);
            });
          },
          error: (err) => {
            console.error('Error al actualizar estado del periodo', err);
            this.lanzarToast('Error', 'No se pudo actualizar el estado a Cerrado.');
            this.isProcessing = false;
          }
        });
      },
      error: (err) => {
        console.error('Error en el cálculo definitivo', err);
        this.lanzarToast('Error Crítico', 'Hubo un fallo al intentar persistir los recibos.');
        this.isProcessing = false;
      }
    });
  }

  lanzarToast(titulo: string, subtitulo: string): void {
    this.toastTitle = titulo;
    this.toastSubtitle = subtitulo;
    this.mostrarToast = true;
    this.cdr.detectChanges();

    // Se limpia el temporizador anterior para evitar solapamientos
    if (this.toastTimeoutId) {
      clearTimeout(this.toastTimeoutId);
    }

    this.toastTimeoutId = setTimeout(() => {
      this.mostrarToast = false;
      this.cdr.detectChanges();
    }, 3500);
  }
}