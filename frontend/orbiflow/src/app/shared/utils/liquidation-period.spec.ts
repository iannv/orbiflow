import {
  entryDateToMinMonthYear,
  formatMonthYearLabel,
  isPeriodInMonthYearRange,
  parseMonthYear,
} from './liquidation-period';

describe('liquidation-period utils', () => {
  it('parseMonthYear valida formato YYYY-MM', () => {
    expect(parseMonthYear('2024-06')).toEqual({ year: 2024, month: 6 });
    expect(parseMonthYear('invalid')).toBeNull();
  });

  it('entryDateToMinMonthYear usa mes de ingreso inclusive', () => {
    expect(entryDateToMinMonthYear('2024-06-15')).toBe('2024-06');
    expect(entryDateToMinMonthYear('2024-06-15T00:00:00Z')).toBe('2024-06');
  });

  it('isPeriodInMonthYearRange incluye ambos extremos del rango', () => {
    const period = { year: 2024, month: 6 };
    expect(isPeriodInMonthYearRange(period, '2024-05', '2024-07')).toBe(true);
    expect(isPeriodInMonthYearRange(period, '2024-07', '2024-05')).toBe(true);
    expect(isPeriodInMonthYearRange(period, '2024-07', '2024-08')).toBe(false);
  });

  it('formatMonthYearLabel devuelve nombre de mes en español', () => {
    expect(formatMonthYearLabel('2024-06')).toBe('Junio 2024');
  });
});
