import { LiquidationSummary } from '../../interfaces/Liquidation';
import { LOGO_ORBIFLOW } from '../../../assets/logo-orbiflow';

function getAssociateName(associateData: any, associatesMap: { [id: number]: string }): string {
  if (!associateData) return 'Socio Desconocido';
  if (typeof associateData === 'object' && associateData.id) {
    return associatesMap[associateData.id] || associateData.full_name || `Socio #${associateData.id}`;
  }
  return associatesMap[associateData] || `Socio #${associateData}`;
}

export function buildLiquidacionConsolidadaTemplate(summary: LiquidationSummary, associatesMap: { [id: number]: string }, monthName: string) {
  
  const tableBody = [];
  
  tableBody.push([
    { text: 'Asociado', bold: true, fillColor: '#f3f4f6' },
    { text: 'Retiro Base', bold: true, alignment: 'right', fillColor: '#f3f4f6' },
    { text: 'Adicionales', bold: true, alignment: 'right', fillColor: '#f3f4f6' },
    { text: 'Recorte', bold: true, alignment: 'right', fillColor: '#f3f4f6' },
    { text: 'Total Pagado', bold: true, alignment: 'right', fillColor: '#f3f4f6' }
  ]);

  summary.retirements.forEach(item => {
    const name = getAssociateName(item.associate || item.associate_id, associatesMap);
    const capAdj = +item.cap_adjustment > 0 ? `-$${item.cap_adjustment}` : '$0.00';
    
    tableBody.push([
      name,
      { text: `$${item.base_amount}`, alignment: 'right' },
      { text: `$${item.additional_amount}`, alignment: 'right' },
      { text: capAdj, alignment: 'right', color: +item.cap_adjustment > 0 ? 'red' : 'black' },
      { text: `$${item.total_amount}`, alignment: 'right', bold: true, color: '#0f766e' }
    ]);
  });

  return {
    content: [

      {
        columns: [

          {
            image: LOGO_ORBIFLOW,
            width: 120, 
            margin: [0, 0, 0, 20] 
          },

          {
            text: [
              { text: 'Auditoría de Retiros\n', style: 'header' },
              { text: 'Cooperativa de Trabajo OrbiFlow Ltda.\n', fontSize: 12, color: '#4b5563' },
              { text: `Periodo Fiscal: ${monthName} ${summary.period.year}\n`, style: 'subheader' },
              { text: `Fecha de Emisión: ${new Date().toLocaleDateString()}`, fontSize: 10, color: '#6b7280' }
            ],
            alignment: 'right',
            margin: [0, 10, 0, 20]
          }
        ]
      },

      {
        table: {
          headerRows: 1,
          widths: ['*', 'auto', 'auto', 'auto', 'auto'], 
          body: tableBody
        },
        layout: 'lightHorizontalLines' 
      },
      
      { text: 'Resumen Global', style: 'subheader', margin: [0, 20, 0, 5] },
      {
        columns: [
          { text: `Retiro Base Total: $${summary.totals.base_amount}` },
          { text: `Adicionales: $${summary.totals.additional_amount}` },
          { text: `Total Pagado: $${summary.totals.total_amount}`, bold: true, color: '#0f766e' }
        ]
      }
    ],
    styles: {
      header: { fontSize: 18, bold: true, color: '#0f766e' },
      subheader: { fontSize: 14, bold: true, margin: [0, 5, 0, 2] }
    }
  };
}