import { ChangeDetectorRef, Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Loader } from '../../components/loader/loader';
import { Calendar, DateRange } from '../../components/calendar/calendar';
import { Select } from '../../components/select/select';
import { Primary } from '../../components/button/primary/primary';
import { LiquidationService } from '../../services/liquidation-service';
import { forkJoin } from 'rxjs';

@Component({
  selector: 'app-archivo-cooperativo',
  standalone: true,
  imports: [CommonModule, FormsModule, Loader, Calendar, Select, Primary],
  templateUrl: './archivo-cooperativo.html',
  styleUrl: './archivo-cooperativo.css',
})
export class ArchivoCooperativo {
  selectedStartDate: Date | null = null;
  selectedEndDate: Date | null = null;

  // store index as string because Select writes string values
  selectedRangeIndex: string = '-1';

  savedRanges: { label: string; startDate: Date; endDate: Date }[] = [];

  // table state
  isLoadingTable: boolean = false;
  tableRows: { associate: string; total: string }[] = [];

  constructor(private readonly liquidationService: LiquidationService, private readonly cdr: ChangeDetectorRef) {}

  onDateRangeSelected(range: DateRange) {
    if (!range || !range.startDate || !range.endDate) return;
    this.selectedStartDate = range.startDate;
    this.selectedEndDate = range.endDate;

    const label = `${this.formatDate(range.startDate)} - ${this.formatDate(range.endDate)}`;
    const last = this.savedRanges[this.savedRanges.length - 1];
    if (!last || last.label !== label) {
      this.savedRanges.push({ label, startDate: range.startDate, endDate: range.endDate });
      // update selected index to last
      this.selectedRangeIndex = String(this.savedRanges.length - 1);
    }
  }

  onSelectRange(indexOrStr: string | number) {
    const idx = Number(indexOrStr);
    if (isNaN(idx) || idx < 0 || idx >= this.savedRanges.length) return;
    const sel = this.savedRanges[idx];
    this.selectedStartDate = sel.startDate;
    this.selectedEndDate = sel.endDate;
  }

  confirmPeriod() {
    if (!this.selectedStartDate || !this.selectedEndDate) return;
    this.isLoadingTable = true;
    this.tableRows = [];

    const months = this.getMonthYearRange(this.selectedStartDate, this.selectedEndDate);

    this.liquidationService.getPeriods().subscribe((periods) => {
      const matching = periods.filter((p) => months.some(m => m.month === p.month && m.year === p.year));
      if (matching.length === 0) {
        this.isLoadingTable = false;
        this.cdr.detectChanges();

        this.tableRows = [];
        return;
      }

      const calls = matching.map((p) => this.liquidationService.getRetirementsByLiquidation(p.id!));
      forkJoin(calls).subscribe({
        next: (results) => {
          // results is array of arrays
          const all = ([] as any[]).concat(...results);
          const map = new Map<string, number>();
          all.forEach(item => {
            const name = item.associate_full_name || item.associate_name || ('#' + item.associate);
            const val = this.parseNumber(item.total_amount || item.base_amount || '0');
            map.set(name, (map.get(name) || 0) + val);
          });

          this.tableRows = Array.from(map.entries()).map(([associate, total]) => ({ associate, total: total.toLocaleString('es-AR') }));
          this.isLoadingTable = false;
          this.cdr.detectChanges();
        },
        error: () => {
          this.tableRows = [];
          this.isLoadingTable = false;
          this.cdr.detectChanges();
        }
      });
    }, () => {
      this.isLoadingTable = false;
      this.cdr.detectChanges();
    });
  }

  private getMonthYearRange(start: Date, end: Date) {
    const res: { month: number; year: number }[] = [];
    let cur = new Date(start.getFullYear(), start.getMonth(), 1);
    const last = new Date(end.getFullYear(), end.getMonth(), 1);
    while (cur <= last) {
      res.push({ month: cur.getMonth() + 1, year: cur.getFullYear() });
      cur = new Date(cur.getFullYear(), cur.getMonth() + 1, 1);
    }
    return res;
  }

  private parseNumber(v: string): number {
    if (!v) return 0;
    // remove non-numeric except dot and comma
    const cleaned = String(v).replace(/[^0-9,.-]/g, '').replace(/,/g, '.');
    const n = Number(cleaned);
    return isNaN(n) ? 0 : n;
  }

  private formatDate(d: Date): string {
    return d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }
  }