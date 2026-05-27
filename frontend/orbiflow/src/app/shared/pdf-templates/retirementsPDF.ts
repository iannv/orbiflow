import { LOGO_ORBIFLOW } from '../../../assets/logo-orbiflow';

// CAMBIAR LOGO ORBIFLOW POR ORBICOOP

export const retirementPDF = {
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
              color: '#4b5563',
            },

            {
              text: 'Mitre 900 - CABA',
              fontSize: 12,
              color: '#4b5563',
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
              text: 'RECIBO DE HABERES',
              bold: true,
              fontSize: 14,
              fillColor: '#e5e7eb',
            },

            {
              text: '25/05/2026',
              bold: true,
              fillColor: '#e5e7eb',
            },
          ],
        ],
      },

      layout: {
        hLineWidth: function () {
          return 1;
        },

        vLineWidth: function (i: any, node: any) {
          // borde izquierdo
          if (i === 0) {
            return 1;
          }

          // borde derecho
          if (i === node.table.widths.length) {
            return 1;
          }

          // ocultar línea del medio
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
                      text: 'Apellido y nombre: ',
                      color: '#6b7280',
                    },

                    {
                      text: 'Gimenez Susana',
                    },
                  ],

                  fontSize: 12,

                  // separación
                  margin: [0, 0, 0, 8],
                },

                {
                  text: [
                    {
                      text: 'CUIL: ',
                      color: '#6b7280',
                    },

                    {
                      text: '27-00000000-1',
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
                      color: '#6b7280',
                    },

                    {
                      text: '01/01/2025',
                    },
                  ],

                  fontSize: 12,

                  // separación
                  margin: [0, 0, 0, 8],
                },

                {
                  text: [
                    {
                      text: 'Cargo: ',
                      color: '#6b7280',
                    },

                    {
                      text: 'Asociado',
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
          // borde izquierdo
          if (i === 0) {
            return 1;
          }

          // borde derecho
          if (i === node.table.widths.length) {
            return 1;
          }

          // ocultar línea del medio
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
              fillColor: '#e5e7eb',
            },

            {
              text: 'HABERES',
              bold: true,
              alignment: 'right',
              fillColor: '#e5e7eb',
            },

            {
              text: 'DESCUENTOS',
              bold: true,
              alignment: 'right',
              fillColor: '#e5e7eb',
            },
          ],

          // ITEMS
          [
            {
              text: 'Sueldo básico',
            },

            {
              text: '$200.000',
              alignment: 'right',
            },

            {
              text: '',
            },
          ],

          [
            {
              text: 'Presentismo',
            },

            {
              text: '$20.000',
              alignment: 'right',
            },

            {
              text: '',
            },
          ],

          [
            {
              text: 'Jubilación',
            },

            {
              text: '',
            },

            {
              text: '$15.000',
              alignment: 'right',
            },
          ],

          // SUBTOTAL
          [
            {
              text: 'SUBTOTAL',
              bold: true,
              fillColor: '#f3f4f6',
            },

            {
              text: '$220.000',
              bold: true,
              alignment: 'right',
              fillColor: '#f3f4f6',
            },

            {
              text: '$15.000',
              bold: true,
              alignment: 'right',
              fillColor: '#f3f4f6',
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
        widths: ['*', 145],

        body: [
          [
            {
              text: 'SON PESOS: CIEN MIL QUINIENTOS CON 55/100',
              italics: true,
              fontSize: 11,
            },

            {
              text: 'SUELDO NETO: $2000000.00',
              bold: true,
              fontSize: 11,
              alignment: 'left',
              fillColor: '#d1fae5',
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
