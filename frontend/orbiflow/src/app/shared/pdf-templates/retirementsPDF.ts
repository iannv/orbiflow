import { LOGO_ORBIFLOW } from '../../../assets/logo-orbiflow';

// CAMBIAR LOGO ORBIFLOW POR ORBICOOP

function getRoleLabel(role: string): string {
  const roles: Record<string, string> = {
    admin: 'Administrador',
    treasurer: 'Tesorero',
    associate: 'Asociado',
  };

  return roles[role.toLowerCase()] || role;
}

// TODO: FORMATEAR FECHA DE INGRESO A dd/mm/yyyy

export function retirementPDF(data: any) {
  const liquidationItems = data.retirement.items || [];

  const itemsRows = liquidationItems.map((item: any) => [
    {
      text: item.module_name,
    },

    {
      text: `$${item.calculated_value}`,
      alignment: 'right',
    },

    {
      text: '',
    },
  ]);

  return {
    content: [
      // HEADER
      {
        columns: [
          {
            image: LOGO_ORBIFLOW,
            width: 80,
            alignment: 'left',
          },

          {
            stack: [
              {
                text: 'Cooperativa de Trabajo OrbiCoop Ltda.',
                fontSize: 16,
                bold: true,
              },

              {
                text: 'CUIT: 00-00000000-0',
                fontSize: 12,
                color: '#575f66',
              },

              {
                text: 'Mitre 900 - CABA',
                fontSize: 12,
                color: '#575f66',
              },
            ],

            alignment: 'right',
            margin: [0, 10, 0, 0],
          },
        ],
      },

      // TITULO
      {
        margin: [0, 20, 0, 0],

        table: {
          widths: ['*', 'auto'],

          body: [
            [
              {
                text: 'DETALLE DE RETIRO',
                bold: true,
                fontSize: 14,
                fillColor: '#bec4cb',
              },

              {
                text: `${data.liquidation.month}/${data.liquidation.year}`,
                bold: true,
                fillColor: '#bec4cb',
              },
            ],
          ],
        },

        layout: {
          hLineWidth: function () {
            return 1;
          },

          vLineWidth: function (i: any, node: any) {
            if (i === 0) {
              return 1;
            }

            if (i === node.table.widths.length) {
              return 1;
            }

            return 0;
          },

          paddingLeft: function () {
            return 8;
          },

          paddingRight: function () {
            return 8;
          },

          paddingTop: function () {
            return 6;
          },

          paddingBottom: function () {
            return 6;
          },
        },
      },

      // DATOS ASOCIADO
      {
        table: {
          widths: ['*', '*'],

          body: [
            [
              {
                stack: [
                  {
                    text: [
                      {
                        text: 'Nombre y apellido: ',
                        color: '#575f66',
                      },

                      {
                        text: data.associate.full_name,
                      },
                    ],

                    fontSize: 12,
                    margin: [0, 0, 0, 8],
                  },

                  {
                    text: [
                      {
                        text: 'DNI: ',
                        color: '#575f66',
                      },

                      {
                        text: data.associate.dni,
                      },
                    ],

                    fontSize: 12,
                  },
                ],
              },

              {
                stack: [
                  {
                    text: [
                      {
                        text: 'Fecha ingreso: ',
                        color: '#575f66',
                      },

                      {
                        text: data.associate.entry_date,
                      },
                    ],

                    fontSize: 12,
                    margin: [0, 0, 0, 8],
                  },

                  {
                    text: [
                      {
                        text: 'Cargo: ',
                        color: '#575f66',
                      },

                      {
                        text: getRoleLabel(data.user.role),
                      },
                    ],

                    fontSize: 12,
                  },
                ],

                alignment: 'left',
              },
            ],
          ],
        },

        layout: {
          hLineWidth: function () {
            return 1;
          },

          vLineWidth: function (i: any, node: any) {
            if (i === 0) {
              return 1;
            }

            if (i === node.table.widths.length) {
              return 1;
            }

            return 0;
          },

          paddingLeft: function () {
            return 8;
          },

          paddingRight: function () {
            return 8;
          },

          paddingTop: function () {
            return 6;
          },

          paddingBottom: function () {
            return 6;
          },
        },
      },

      // TABLA LIQUIDACION
      {
        table: {
          headerRows: 1,

          widths: ['*', 'auto', 'auto'],

          body: [
            // HEADER
            [
              {
                text: 'CONCEPTO',
                bold: true,
                fillColor: '#bec4cb',
              },

              {
                text: 'HABERES',
                bold: true,
                alignment: 'right',
                fillColor: '#bec4cb',
              },

              {
                text: 'DESCUENTOS',
                bold: true,
                alignment: 'right',
                fillColor: '#bec4cb',
              },
            ],

            // ITEMS DINAMICOS
            ...itemsRows,

            // SUBTOTAL
            [
              {
                text: 'SUBTOTAL',
                bold: true,
                fillColor: '#bec4cb',
              },

              {
                text: `$${data.retirement.total_amount}`,
                bold: true,
                alignment: 'right',
                fillColor: '#bec4cb',
              },

              {
                text: '$0',
                bold: true,
                alignment: 'right',
                fillColor: '#bec4cb',
              },
            ],
          ],
        },

        layout: {
          hLineWidth: function (i: any, node: any) {
            // Línea superior
            if (i === 0) {
              return 1;
            }

            // Línea debajo del header
            if (i === 1) {
              return 1;
            }

            // Línea arriba de SUBTOTAL
            if (i === node.table.body.length - 1) {
              return 1;
            }

            // Línea final
            if (i === node.table.body.length) {
              return 1;
            }

            return 0;
          },

          vLineWidth: function () {
            return 1;
          },

          paddingLeft: function () {
            return 8;
          },

          paddingRight: function () {
            return 8;
          },

          paddingTop: function () {
            return 6;
          },

          paddingBottom: function () {
            return 6;
          },
        },
      },

      // NETO A COBRAR
      {
        table: {
          widths: ['*', 164],

          body: [
            [
              {
                text: `SON PESOS: ${data.totalToString.toUpperCase()} `,
                italics: true,
                fontSize: 11,
              },

              {
                text: `SUELDO NETO: $${data.retirement.total_amount}`,
                bold: true,
                fontSize: 12,
                alignment: 'left',
                // fillColor: '#a8adb3',
              },
            ],
          ],
        },

        layout: {
          paddingLeft: function () {
            return 8;
          },

          paddingRight: function () {
            return 8;
          },

          paddingTop: function () {
            return 8;
          },

          paddingBottom: function () {
            return 8;
          },
        },
      },
    ],
  };
}