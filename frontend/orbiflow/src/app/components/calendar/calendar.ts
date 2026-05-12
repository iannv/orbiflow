import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface DateRange {
  startDate: Date;
  endDate: Date;
}

@Component({
  selector: 'app-calendar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './calendar.html',
  styleUrl: './calendar.css'
})
export class Calendar implements OnInit {
  @Input() selectedStartDate: Date | null = null;
  @Input() selectedEndDate:   Date | null = null;
  @Input() minDate: Date | null = null;
  @Input() maxDate: Date | null = null;
  @Input() mode: 'single' | 'range' = 'range';

  @Output() dateSelected      = new EventEmitter<Date>();
  @Output() dateRangeSelected = new EventEmitter<DateRange>();

  currentMonth: Date = new Date();
  calendarDays: (number | null)[] = [];
  monthYear = '';

  readonly daysOfWeek = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

  private readonly MONTH_NAMES = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];

  ngOnInit(): void {
    if (this.selectedStartDate) {
      this.currentMonth = new Date(this.selectedStartDate);
    }
    this.generateCalendar();
  }

  generateCalendar(): void {
    const year  = this.currentMonth.getFullYear();
    const month = this.currentMonth.getMonth();
    const firstDay    = new Date(year, month, 1);
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    let startOffset = firstDay.getDay() - 1;
    if (startOffset < 0) startOffset = 6;

    this.calendarDays = [
      ...Array(startOffset).fill(null),
      ...Array.from({ length: daysInMonth }, (_, i) => i + 1)
    ];

    const remaining = this.calendarDays.length % 7;
    if (remaining !== 0) {
      this.calendarDays.push(...Array(7 - remaining).fill(null));
    }

    this.monthYear = `${this.MONTH_NAMES[month]} ${year}`;
  }

  selectDate(day: number | null): void {
    if (day === null || this.isDayDisabled(day)) return;
    const date = this.buildDate(day);

    if (this.mode === 'single') {
      this.selectedStartDate = date;
      this.dateSelected.emit(date);
      return;
    }

    if (!this.selectedStartDate || (this.selectedStartDate && this.selectedEndDate)) {
      this.selectedStartDate = date;
      this.selectedEndDate = null;
    } else {
      if (date < this.selectedStartDate) {
        this.selectedEndDate   = this.selectedStartDate;
        this.selectedStartDate = date;
      } else {
        this.selectedEndDate = date;
      }
      this.dateRangeSelected.emit({
        startDate: this.selectedStartDate,
        endDate:   this.selectedEndDate
      });
    }
  }

  isDaySelected(day: number | null): boolean {
    if (!day) return false;
    const d = this.buildDate(day);
    return (!!this.selectedStartDate && this.isSameDay(d, this.selectedStartDate)) ||
           (!!this.selectedEndDate   && this.isSameDay(d, this.selectedEndDate));
  }

  isDayInRange(day: number | null): boolean {
    if (!day || !this.selectedStartDate || !this.selectedEndDate) return false;
    const d = this.buildDate(day);
    return d > this.selectedStartDate && d < this.selectedEndDate;
  }

  isDayDisabled(day: number | null): boolean {
    if (!day) return true;
    const d = this.buildDate(day);
    return (!!this.minDate && d < this.minDate) ||
           (!!this.maxDate && d > this.maxDate);
  }

  isToday(day: number | null): boolean {
    if (!day) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return this.isSameDay(this.buildDate(day), today);
  }

  previousMonth(): void {
    this.currentMonth = new Date(
      this.currentMonth.getFullYear(),
      this.currentMonth.getMonth() - 1
    );
    this.generateCalendar();
  }

  nextMonth(): void {
    this.currentMonth = new Date(
      this.currentMonth.getFullYear(),
      this.currentMonth.getMonth() + 1
    );
    this.generateCalendar();
  }

  goToToday(): void {
    this.currentMonth = new Date();
    this.generateCalendar();
  }

  formatDate(date: Date | null): string {
    if (!date) return '—';
    return date.toLocaleDateString('es-AR', {
      day: '2-digit', month: '2-digit', year: 'numeric'
    });
  }

  private buildDate(day: number): Date {
    const d = new Date(
      this.currentMonth.getFullYear(),
      this.currentMonth.getMonth(),
      day
    );
    d.setHours(0, 0, 0, 0);
    return d;
  }

  private isSameDay(a: Date, b: Date): boolean {
    return a.getFullYear() === b.getFullYear() &&
           a.getMonth()    === b.getMonth()    &&
           a.getDate()     === b.getDate();
  }
}