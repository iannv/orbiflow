import { Component, OnInit, inject, ChangeDetectorRef, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LiquidationService } from '../../../services/liquidation-service';
import { AssociateService } from '../../../services/associate-service';
import { LiquidationPeriod, LiquidationSummary } from '../../../interfaces/Liquidation';
import { PdfGeneratorService } from '../../../services/pdf-service';
import { Modal } from '../../../components/modal/modal';
import { buildLiquidacionConsolidadaTemplate } from '../../../shared/pdf-templates/closedLiquidations-template';
import { formatCurrency } from '../../../shared/utils/formatCurrency';
import { formatPercentage } from '../../../shared/utils/formatPercentage';

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

  // Utilidades
  formatCurrency = formatCurrency;
  formatPercentage = formatPercentage;

  private liquidationService = inject(LiquidationService);
  private associateService = inject(AssociateService);
  private cdr = inject(ChangeDetectorRef);
  private ngZone = inject(NgZone);
  private pdfService = inject(PdfGeneratorService);

  ngOnInit() {
    this.cargarMapaAsociados();
    this.loadClosedPeriods();
  }

  cargarMapaAsociados() {
    this.associateService.getAssociates().subscribe((data) => {
      this.ngZone.run(() => {
        data.forEach((assoc) => {
          this.associatesMap[assoc.id] = assoc.full_name;
        });
        this.cdr.detectChanges();
      });
    });
  }

  getAssociateName(associateData: any): string {
    if (!associateData) return 'Socio Desconocido';

    // Validar explícitamente que no sea null antes de buscar propiedades
    if (typeof associateData === 'object' && associateData !== null && associateData.id) {
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
        this.ngZone.run(() => {
          this.groupPeriodsByYear(res);
          this.isLoading = false;
          this.cdr.detectChanges();
        });

        res.forEach((period) => {
          const pId = period.id;

          if (pId) {
            this.liquidationService.getSummary(pId).subscribe((summary) => {
              if (summary && summary.totals) {
                this.ngZone.run(() => {
                  this.periodTotals[pId] = summary.totals.total_amount;
                  this.cdr.detectChanges();
                });
              }
            });
          }
        });
      },
      error: (err: any) => {
        console.error('Error al recuperar el histórico:', err);
        this.ngZone.run(() => {
          this.isLoading = false;
          this.cdr.detectChanges();
        });
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
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
    ];
    return meses[month - 1] || month.toString();
  }

  openDetailsModal(periodId?: number) {
    if (!periodId) return;
    
    //Bloqueo de peticiones simultáneas (Spam Clic)
    if (this.isLoadingDetails) return;

    this.isDetailsModalOpen = true;
    this.isLoadingDetails = true;
    this.selectedSummary = null;
    this.cdr.detectChanges();

    this.liquidationService.getSummary(periodId).subscribe({
      next: (res: LiquidationSummary) => {
        this.ngZone.run(() => {
          this.selectedSummary = res;
          this.isLoadingDetails = false;
          this.cdr.detectChanges();
        });
      },
      error: (err: any) => {
        console.error('Error al cargar el detalle', err);
        this.ngZone.run(() => {
          this.isLoadingDetails = false;
          this.cdr.detectChanges();
        });
      },
    });
  }

  closeDetailsModal() {
    this.isDetailsModalOpen = false;
    this.selectedSummary = null;
  }

  descargarPDF() {
    if (!this.selectedSummary) return;

    const monthName = this.getMonthName(this.selectedSummary.period.month);

    const documentoEstructura = buildLiquidacionConsolidadaTemplate(
      this.selectedSummary,
      this.associatesMap,
      monthName,
    );

    const nombreArchivo = `Liquidacion_${monthName}_${this.selectedSummary.period.year}.pdf`;

    this.pdfService.descargar(documentoEstructura, nombreArchivo);
  }
}