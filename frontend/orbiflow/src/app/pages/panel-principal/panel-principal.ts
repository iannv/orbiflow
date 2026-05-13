import { Component } from '@angular/core';

import { BaseCard } from '../../components/base-card/base-card';

@Component({
  selector: 'app-panel-principal',
  standalone: true,
  imports: [BaseCard],
  templateUrl: './panel-principal.html',
  styleUrl: './panel-principal.css',
})

export class PanelPrincipal {
  asociadosActivos: number = 0;
  totalAsociados: number = 0;

  modulosActivos: number = 0;
  totalModulos: number = 0;

  liquidacionesMes: number = 0;
  fechaLiquidaciones: string = '';

  recibosGenerados: number = 0;

  usuariosRegistrados: number = 0;
  ultimaLiquidacion: string = '';
}

