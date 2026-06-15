export function toPeriodYm(year: number, month: number): number {
  return year * 12 + (month - 1);
}

export function parseMonthYear(value: string): { year: number; month: number } | null {
  const match = /^(\d{4})-(\d{2})$/.exec(value);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  if (month < 1 || month > 12) return null;

  return { year, month };
}

export function formatMonthYear(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, '0')}`;
}

export function entryDateToMinMonthYear(entryDate: string): string {
  const [datePart] = entryDate.split('T');
  const [yearStr, monthStr] = datePart.split('-');
  return formatMonthYear(Number(yearStr), Number(monthStr));
}

export function isPeriodInMonthYearRange(
  period: { year: number; month: number },
  start: string,
  end: string,
): boolean {
  const startParsed = parseMonthYear(start);
  const endParsed = parseMonthYear(end);
  if (!startParsed || !endParsed) return false;

  const lo = Math.min(
    toPeriodYm(startParsed.year, startParsed.month),
    toPeriodYm(endParsed.year, endParsed.month),
  );
  const hi = Math.max(
    toPeriodYm(startParsed.year, startParsed.month),
    toPeriodYm(endParsed.year, endParsed.month),
  );
  const periodYm = toPeriodYm(period.year, period.month);

  return periodYm >= lo && periodYm <= hi;
}

export function formatMonthYearLabel(value: string): string {
  const parsed = parseMonthYear(value);
  if (!parsed) return value;

  const months = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
  ];
  return `${months[parsed.month - 1]} ${parsed.year}`;
}
