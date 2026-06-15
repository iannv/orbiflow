import { Component } from '@angular/core';
import { ClosedPeriodsPanelComponent } from '../../../components/closed-periods-panel/closed-periods-panel';

@Component({
  selector: 'app-closed-liquidations',
  standalone: true,
  imports: [ClosedPeriodsPanelComponent],
  templateUrl: './closed-liquidations.html',
  styleUrl: './closed-liquidations.css',
})
export class ClosedLiquidationsComponent {}
