import { Component, Input, OnInit, inject, ChangeDetectorRef, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LiquidationService } from '../../services/liquidation-service';
import { AssociateService } from '../../services/associate-service';
import { AuthService } from '../../core/auth/auth.service';
import { LiquidationPeriod, LiquidationSummary } from '../../interfaces/Liquidation';
import { PdfGeneratorService } from '../../services/pdf-service';
import { Modal } from '../modal/modal';
import { Loader } from '../loader/loader';
import { Primary } from '../button/primary/primary';
import { buildLiquidacionConsolidadaTemplate } from '../../shared/pdf-templates/closedLiquidations-template';
import { formatCurrency } from '../../shared/utils/formatCurrency';
import { formatPercentage } from '../../shared/utils/formatPercentage';
import {
  entryDateToMinMonthYear,
  formatMonthYear,
  formatMonthYearLabel,
  isPeriodInMonthYearRange,
  toPeriodYm,
} from '../../shared/utils/liquidation-period';

type RangeMode = 'all' | 'custom';

interface MonthYearOption {
  value: string;
  label: string;
}

@Component({
  selector: 'app-closed-periods-panel',
  standalone: true,
  imports: [CommonModule, FormsModule, Modal, Loader, Primary],
  templateUrl: './closed-periods-panel.html',
  styleUrl: './closed-periods-panel.css',
})
export class ClosedPeriodsPanelComponent implements OnInit {
  @Input() showMonthRangeFilter = false;
  @Input() showAuditNote = true;

  allPeriods: LiquidationPeriod[] = [];
  periodsByYear: { [year: number]: LiquidationPeriod[] } = {};
  years: number[] = [];
  isLoading = true;
  rangeApplied = false;
  rangeMode: RangeMode = 'all';

  startMonthYear = '';
  endMonthYear = '';
  monthYearOptions: MonthYearOption[] = [];
  minMonthYear: string | null = null;
  rangeError = '';
  appliedRangeSummary = '';

  associatesMap: { [id: number]: string } = {};
  periodTotals: { [periodId: number]: string } = {};

  isDetailsModalOpen = false;
  selectedSummary: LiquidationSummary | null = null;
  isLoadingDetails = false;

  formatCurrency = formatCurrency;
  formatPercentage = formatPercentage;
  formatMonthYearLabel = formatMonthYearLabel;

  get minMonthYearLabel(): string | null {
    return this.minMonthYear ? formatMonthYearLabel(this.minMonthYear) : null;
  }

  get isCustomRange(): boolean {
    return this.rangeMode === 'custom';
  }

  get startMonthYearOptions(): MonthYearOption[] {
    if (!this.endMonthYear) return this.monthYearOptions;
    return this.monthYearOptions.filter((option) => option.value <= this.endMonthYear);
  }

  get endMonthYearOptions(): MonthYearOption[] {
    if (!this.startMonthYear) return this.monthYearOptions;
    return this.monthYearOptions.filter((option) => option.value >= this.startMonthYear);
  }

  private liquidationService = inject(LiquidationService);
  private associateService = inject(AssociateService);
  private authService = inject(AuthService);
  private cdr = inject(ChangeDetectorRef);
  private ngZone = inject(NgZone);
  private pdfService = inject(PdfGeneratorService);

  ngOnInit() {
    this.cargarMapaAsociados();
    this.loadAssociateConstraints();
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

  private loadAssociateConstraints() {
    const user = this.authService.currentUser();
    if (!user || user.role !== 'associate') return;

    this.associateService.getAssociateByUser(user.id).subscribe((profiles) => {
      const profile = profiles[0];
      if (!profile?.entry_date) return;

      this.ngZone.run(() => {
        this.minMonthYear = entryDateToMinMonthYear(profile.entry_date);
        if (this.showMonthRangeFilter) {
          if (!this.startMonthYear && this.allPeriods.length > 0) {
            this.setDefaultMonthRange(this.allPeriods);
          } else if (this.minMonthYear && this.startMonthYear < this.minMonthYear) {
            this.startMonthYear = this.minMonthYear;
          }
        }
        this.cdr.detectChanges();
      });
    });
  }

  getAssociateName(associateData: any): string {
    if (!associateData) return 'Socio Desconocido';

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
          this.allPeriods = res;
          if (!this.showMonthRangeFilter) {
            this.applyPeriodGrouping(res);
          } else {
            this.buildMonthYearOptions(res);
            this.setDefaultMonthRange(res);
          }
          this.isLoading = false;
          this.cdr.detectChanges();
        });

        res.forEach((period) => {
          const pId = period.id;
          if (pId) {
            this.liquidationService.getSummary(pId).subscribe((summary) => {
              if (summary?.totals) {
                this.ngZone.run(() => {
                  this.periodTotals[pId] = summary.totals.total_amount;
                  this.cdr.detectChanges();
                });
              }
            });
          }
        });
      },
      error: (err: unknown) => {
        console.error('Error al recuperar el histórico:', err);
        this.ngZone.run(() => {
          this.isLoading = false;
          this.cdr.detectChanges();
        });
      },
    });
  }

  onRangeModeChange() {
    this.rangeError = '';
    if (this.rangeMode === 'custom') {
      this.setDefaultMonthRange(this.allPeriods);
    }
  }

  confirmMonthRange() {
    this.rangeError = '';

    if (this.rangeMode === 'all') {
      if (this.allPeriods.length === 0) {
        this.rangeError = 'No hay liquidaciones cerradas disponibles para consultar.';
        return;
      }
      this.rangeApplied = true;
      this.appliedRangeSummary = 'Todos los periodos disponibles';
      this.applyPeriodGrouping(this.allPeriods);
      this.cdr.detectChanges();
      return;
    }

    if (!this.startMonthYear || !this.endMonthYear) {
      this.rangeError = 'Seleccioná el primer y el último mes del rango.';
      return;
    }

    if (this.minMonthYear) {
      if (this.startMonthYear < this.minMonthYear || this.endMonthYear < this.minMonthYear) {
        this.rangeError = `Solo podés consultar desde ${this.minMonthYearLabel} (tu mes de ingreso).`;
        return;
      }
    }

    const filtered = this.allPeriods.filter((period) =>
      isPeriodInMonthYearRange(period, this.startMonthYear, this.endMonthYear),
    );

    if (filtered.length === 0) {
      this.rangeError =
        'No hay liquidaciones cerradas en ese rango. Probá ampliarlo o elegir otros meses.';
      return;
    }

    this.rangeApplied = true;
    this.appliedRangeSummary = `${formatMonthYearLabel(this.startMonthYear)} al ${formatMonthYearLabel(this.endMonthYear)}`;
    this.applyPeriodGrouping(filtered);
    this.cdr.detectChanges();
  }

  private buildMonthYearOptions(periods: LiquidationPeriod[]) {
    const seen = new Set<string>();
    const sorted = [...periods].sort(
      (a, b) => toPeriodYm(b.year, b.month) - toPeriodYm(a.year, a.month),
    );

    this.monthYearOptions = sorted.reduce<MonthYearOption[]>((options, period) => {
      const value = formatMonthYear(period.year, period.month);
      if (seen.has(value)) return options;
      seen.add(value);
      options.push({ value, label: formatMonthYearLabel(value) });
      return options;
    }, []);
  }

  private setDefaultMonthRange(periods: LiquidationPeriod[]) {
    if (periods.length === 0 || this.monthYearOptions.length === 0) {
      this.startMonthYear = '';
      this.endMonthYear = '';
      return;
    }

    const sorted = [...periods].sort(
      (a, b) => toPeriodYm(a.year, a.month) - toPeriodYm(b.year, b.month),
    );
    const first = sorted[0];
    const last = sorted[sorted.length - 1];

    this.startMonthYear = formatMonthYear(first.year, first.month);
    this.endMonthYear = formatMonthYear(last.year, last.month);

    if (this.minMonthYear && this.startMonthYear < this.minMonthYear) {
      this.startMonthYear = this.minMonthYear;
    }
    if (this.startMonthYear > this.endMonthYear) {
      this.endMonthYear = this.startMonthYear;
    }
  }

  private applyPeriodGrouping(periods: LiquidationPeriod[]) {
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
    if (!periodId || this.isLoadingDetails) return;

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
      error: (err: unknown) => {
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
