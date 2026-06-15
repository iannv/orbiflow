import { Component } from '@angular/core';
import { ClosedPeriodsPanelComponent } from '../../components/closed-periods-panel/closed-periods-panel';

@Component({
  selector: 'app-archivo-cooperativo',
  standalone: true,
  imports: [ClosedPeriodsPanelComponent],
  templateUrl: './archivo-cooperativo.html',
  styleUrl: './archivo-cooperativo.css',
})
export class ArchivoCooperativo {}
