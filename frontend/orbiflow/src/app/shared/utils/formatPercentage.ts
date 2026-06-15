export function formatPercentage(value: string | number): string {
  const num = Number(value);
  if (isNaN(num)) return '0';

  return new Intl.NumberFormat('es-AR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  }).format(num);
}