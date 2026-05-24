import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LiquidationService } from '../../../services/liquidation-service';
import { AssociateService } from '../../../services/associate-service';
import { LiquidationPeriod, LiquidationSummary } from '../../../interfaces/Liquidation';
import { Modal } from '../../../components/modal/modal';

@Component({
  selector: 'app-closed-liquidations',
  standalone: true,
  imports: [CommonModule, Modal],
  templateUrl: './closed-liquidations.html',
  styleUrl: './closed-liquidations.css',
})
export class ClosedLiquidationsComponent implements OnInit {
  periodsByYear: { [year: number]: LiquidationPeriod[] } = {};
  years: number[] = [];
  isLoading = true;

  associatesMap: { [id: number]: string } = {};
  periodTotals: { [periodId: number]: string } = {};

  isDetailsModalOpen = false;
  selectedSummary: LiquidationSummary | null = null;
  isLoadingDetails = false;

  private liquidationService = inject(LiquidationService);
  private associateService = inject(AssociateService);
  private cdr = inject(ChangeDetectorRef);

  ngOnInit() {
    this.cargarMapaAsociados();
    this.loadClosedPeriods();
  }

  cargarMapaAsociados() {
    this.associateService.getAssociates().subscribe((data) => {
      data.forEach((assoc) => {
        this.associatesMap[assoc.id] = assoc.full_name;
      });
    });
  }

  getAssociateName(associateData: any): string {
    if (!associateData) return 'Socio Desconocido';

    if (typeof associateData === 'object' && associateData.id) {
      return (
        this.associatesMap[associateData.id] ||
        associateData.full_name ||
        `Socio #${associateData.id}`
      );
    }

    return this.associatesMap[associateData] || `Socio #${associateData}`;
  }

  loadClosedPeriods() {
    this.liquidationService.getPeriods('closed').subscribe({
      next: (res: LiquidationPeriod[]) => {
        this.groupPeriodsByYear(res);
        this.isLoading = false;
        this.cdr.detectChanges();

        res.forEach((period) => {
          const pId = period.id;

          if (pId) {
            this.liquidationService.getSummary(pId).subscribe((summary) => {
              if (summary && summary.totals) {
                this.periodTotals[pId] = summary.totals.total_amount;
                this.cdr.detectChanges();
              }
            });
          }
        });
      },
      error: (err: any) => {
        console.error('Error al recuperar el histórico:', err);
        this.isLoading = false;
        this.cdr.detectChanges();
      },
    });
  }

  private groupPeriodsByYear(periods: LiquidationPeriod[]) {
    this.periodsByYear = {};
    periods.forEach((p) => {
      if (!this.periodsByYear[p.year]) {
        this.periodsByYear[p.year] = [];
      }
      this.periodsByYear[p.year].push(p);
    });

    this.years = Object.keys(this.periodsByYear)
      .map(Number)
      .sort((a, b) => b - a);
  }

  getMonthName(month: number): string {
    const meses = [
      'Enero',
      'Febrero',
      'Marzo',
      'Abril',
      'Mayo',
      'Junio',
      'Julio',
      'Agosto',
      'Septiembre',
      'Octubre',
      'Noviembre',
      'Diciembre',
    ];
    return meses[month - 1] || month.toString();
  }

  openDetailsModal(periodId?: number) {
    if (!periodId) return;

    this.isDetailsModalOpen = true;
    this.isLoadingDetails = true;
    this.selectedSummary = null;
    this.cdr.detectChanges();

    this.liquidationService.getSummary(periodId).subscribe({
      next: (res: LiquidationSummary) => {
        this.selectedSummary = res;
        this.isLoadingDetails = false;
        this.cdr.detectChanges();
      },
      error: (err: any) => {
        console.error('Error al cargar el detalle', err);
        this.isLoadingDetails = false;
        this.cdr.detectChanges();
      },
    });
  }

  closeDetailsModal() {
    this.isDetailsModalOpen = false;
    this.selectedSummary = null;
  }
}
