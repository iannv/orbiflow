import { Component } from '@angular/core';

import { BaseCard } from '../../components/base-card/base-card';

@Component({
  selector: 'app-panel-principal',
  standalone: true,
  imports: [BaseCard],
  templateUrl: './panel-principal.html',
  styleUrl: './panel-principal.css',
})
export class PanelPrincipal {}