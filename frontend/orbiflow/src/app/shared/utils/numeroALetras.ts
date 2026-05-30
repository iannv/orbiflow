export function numeroALetras(num: number): string {
  const UNIDADES = [
    '',
    'uno',
    'dos',
    'tres',
    'cuatro',
    'cinco',
    'seis',
    'siete',
    'ocho',
    'nueve',
    'diez',
    'once',
    'doce',
    'trece',
    'catorce',
    'quince',
    'dieciséis',
    'diecisiete',
    'dieciocho',
    'diecinueve',
  ];

  const DECENAS = [
    '',
    '',
    'veinte',
    'treinta',
    'cuarenta',
    'cincuenta',
    'sesenta',
    'setenta',
    'ochenta',
    'noventa',
  ];

  const CENTENAS = [
    '',
    'ciento',
    'doscientos',
    'trescientos',
    'cuatrocientos',
    'quinientos',
    'seiscientos',
    'setecientos',
    'ochocientos',
    'novecientos',
  ];

  function convertirGrupo(n: number): string {
    if (n === 0) return '';
    if (n === 100) return 'cien';

    let output = '';

    const c = Math.floor(n / 100);
    const d = Math.floor((n % 100) / 10);
    const u = n % 10;
    const du = n % 100;

    if (c) output += CENTENAS[c] + ' ';

    if (du < 20) {
      output += UNIDADES[du];
    } else {
      output += DECENAS[d];
      if (u) output += ' y ' + UNIDADES[u];
    }

    return output.trim();
  }

  function seccion(num: number, divisor: number, singular: string, plural: string): string {
    const cantidad = Math.floor(num / divisor);
    if (cantidad === 0) return '';

    if (cantidad === 1) {
      return singular;
    }

    return `${convertirGrupo(cantidad)} ${plural}`;
  }

  const enteros = Math.floor(num);
  const centavos = Math.round((num - enteros) * 100);

  const millones = seccion(enteros, 1000000, 'un millón', 'millones');
  const miles = seccion(enteros % 1000000, 1000, 'mil', 'mil');
  const cientos = convertirGrupo(enteros % 1000);

  let resultado = [millones, miles, cientos].filter(Boolean).join(' ').trim() || 'cero';

  const centavosEnLetras =
    centavos === 0 ? 'cero centavos' : `${convertirGrupo(centavos)} centavos`;

  return `${resultado} con ${centavosEnLetras}`;
}
