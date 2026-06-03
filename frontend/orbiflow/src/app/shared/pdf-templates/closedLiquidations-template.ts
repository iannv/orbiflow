import { LiquidationSummary } from '../../interfaces/Liquidation';
import { LOGO_ORBIFLOW } from '../../../assets/logo-orbiflow';
import { formatCurrency } from '../utils/formatCurrency';
import { formatPercentage } from '../utils/formatPercentage';

function getAssociateName(associateData: any, associatesMap: { [id: number]: string }): string {
  if (!associateData) return 'Socio Desconocido';
  if (typeof associateData === 'object' && associateData.id) {
    return (
      associatesMap[associateData.id] || associateData.full_name || `Socio #${associateData.id}`
    );
  }
  return associatesMap[associateData] || `Socio #${associateData}`;
}

export function buildLiquidacionConsolidadaTemplate(
  summary: LiquidationSummary,
  associatesMap: { [id: number]: string },
  monthName: string,
) {
  const tableBody = [];

  // Encabezado de la tabla principal
  tableBody.push([
    { text: 'Asociado', bold: true, fillColor: '#f3f4f6' },
    { text: 'Retiro Base', bold: true, alignment: 'right', fillColor: '#f3f4f6' },
    { text: 'Adicionales', bold: true, alignment: 'right', fillColor: '#f3f4f6' },
    { text: 'Recorte', bold: true, alignment: 'right', fillColor: '#f3f4f6' },
    { text: 'Total Pagado', bold: true, alignment: 'right', fillColor: '#f3f4f6' },
  ]);

  // Cargar los asociados
  summary.retirements.forEach((item) => {
    const name = getAssociateName(item.associate || item.associate_id, associatesMap);

    const capAdj =
      +item.cap_adjustment > 0 ? `-$${formatCurrency(item.cap_adjustment || 0)}` : '$0,00';

    tableBody.push([
      { text: name, margin: [0, 5, 0, 0] },
      {
        text: `$${formatCurrency(item.base_amount || 0)}`,
        alignment: 'right',
        margin: [0, 5, 0, 0],
      },
      {
        text: `$${formatCurrency(item.additional_amount || 0)}`,
        alignment: 'right',
        margin: [0, 5, 0, 0],
      },
      {
        text: capAdj,
        alignment: 'right',
        color: +item.cap_adjustment > 0 ? 'red' : 'black',
        margin: [0, 5, 0, 0],
      },
      {
        text: `$${formatCurrency(item.total_amount || 0)}`,
        alignment: 'right',
        bold: true,
        color: '#0f766e',
        margin: [0, 5, 0, 0],
      },
    ]);

    // conceptos individuales
    let conceptosText =
      item.items && item.items.length > 0
        ? item.items
            .map((d: any) => `${d.module_name}: +$${formatCurrency(d.calculated_value || 0)}`)
            .join('\n')
        : 'Sin conceptos aplicados';

    tableBody.push([
      {
        colSpan: 5,
        fillColor: '#fafafa',
        margin: [10, 5, 10, 10],
        columns: [
          {
            width: '*',
            text: [
              //  Horas Liquidadas
              { text: 'Cálculo Base:\n', fontSize: 9, bold: true, color: '#4b5563' },
              { text: `Horas Liquidadas: ${item.hours_worked || 0} hs\n\n`, fontSize: 9, color: '#6b7280' },
              
              //  Conceptos
              { text: 'Conceptos Aplicados:\n', fontSize: 9, bold: true, color: '#4b5563' },
              { text: conceptosText, fontSize: 9, color: '#6b7280' },
            ],
          },
          {
            width: '*',
            text: [
              { text: 'Descuentos:\n', fontSize: 9, bold: true, color: '#4b5563' },
              {
                text: `Ajuste por Tope: ${capAdj}`,
                fontSize: 9,
                color: +item.cap_adjustment > 0 ? 'red' : '#6b7280',
              },
            ],
          },
        ],
      },
      '',
      '',
      '',
      '',
    ]);
  });

  // Estructura general del pdf
  return {
    content: [
      {
        columns: [
          {
            image: LOGO_ORBIFLOW,
            width: 120,
            margin: [0, 0, 0, 20],
          },
          {
            text: [
              { text: 'Auditoría de Retiros\n', style: 'header' },
              { text: 'Cooperativa de Trabajo OrbiCoop Ltda.\n', fontSize: 12, color: '#4b5563' },
              { text: 'CUIT: 00-00000000-0\n', fontSize: 12, color: '#4b5563' },
              { text: 'Mitre 900 - CABA\n', fontSize: 12, color: '#4b5563' },
              { text: `Periodo Fiscal: ${monthName} ${summary.period.year}\n`, style: 'subheader' },

              {
                text: `Valor Hora Aplicado: $${formatCurrency(summary.period.applied_hour_value || 0)}  |  Tope: ${formatPercentage(summary.period.applied_cap_pct || 0)}%\n`,
                fontSize: 10,
                bold: true,
                color: '#0f766e',
                margin: [0, 2, 0, 4],
              },

              {
                text: `Fecha de Emisión: ${new Date().toLocaleDateString()}`,
                fontSize: 10,
                color: '#6b7280',
              },
            ],
            alignment: 'right',
            margin: [0, 10, 0, 20],
          },
        ],
      },
      {
        table: {
          headerRows: 1,
          widths: ['*', 'auto', 'auto', 'auto', 'auto'],
          body: tableBody,
        },
        layout: 'lightHorizontalLines',
      },
      { text: 'Resumen Global', style: 'subheader', margin: [0, 20, 0, 10] },
      {
        columns: [
          { width: '*', text: '' },
          {
            width: 280,
            layout: {
              hLineWidth: function (i: number, node: any) {
                return i === node.table.body.length - 1 ? 1 : 0;
              },
              vLineWidth: function () {
                return 0;
              },
              hLineColor: function () {
                return '#e5e7eb';
              },
              paddingTop: function () {
                return 4;
              },
              paddingBottom: function () {
                return 4;
              },
            },
            table: {
              widths: ['*', 'auto'],
              body: [
                [
                  { text: 'Retiro Base Total', color: '#4b5563' },
                  {
                    text: `$${formatCurrency(summary.totals.base_amount || 0)}`,
                    alignment: 'right',
                  },
                ],
                [
                  { text: 'Adicionales', color: '#4b5563' },
                  {
                    text: `+$${formatCurrency(summary.totals.additional_amount || 0)}`,
                    alignment: 'right',
                  },
                ],
                ...(+summary.totals.cap_adjustment > 0
                  ? [
                      [
                        { text: 'Ajuste por Tope', color: '#ef4444' },
                        {
                          text: `-$${formatCurrency(summary.totals.cap_adjustment || 0)}`,
                          alignment: 'right',
                          color: '#ef4444',
                        },
                      ],
                    ]
                  : []),
                [
                  { text: 'Total Pagado', bold: true, fontSize: 12, margin: [0, 4, 0, 0] },
                  {
                    text: `$${formatCurrency(summary.totals.total_amount || 0)}`,
                    alignment: 'right',
                    bold: true,
                    fontSize: 12,
                    color: '#0f766e',
                    margin: [0, 4, 0, 0],
                  },
                ],
              ],
            },
          },
        ],
      },
    ],
    styles: {
      header: { fontSize: 18, bold: true, color: '#0f766e' },
      subheader: { fontSize: 14, bold: true, margin: [0, 5, 0, 2] },
    },
  };
}