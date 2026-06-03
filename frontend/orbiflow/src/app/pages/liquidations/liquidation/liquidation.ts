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

@Component({
  selector: 'app-liquidation',
  standalone: true,
  imports: [CommonModule, FormsModule, Modal, Toast],
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

  isConfirmModalOpen = false;
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
    this.cdr.detectChanges();
  }

 onLoadData() {
    if (!this.selectedPeriodId) return;

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

          this.cdr.detectChanges(); 
        });
      },
      error: (err) => {
        console.error('Error al previsualizar cálculos', err);
        this.lanzarToast('Error', 'No se pudieron simular los detalles.');
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
          }
        });
      },
      error: (err) => {
        console.error('Error en el cálculo definitivo', err);
        this.lanzarToast('Error Crítico', 'Hubo un fallo al intentar persistir los recibos.');
      }
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