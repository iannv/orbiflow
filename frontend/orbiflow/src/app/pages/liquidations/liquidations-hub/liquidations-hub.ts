import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { LiquidationService } from '../../../services/liquidation-service';

@Component({
  selector: 'app-liquidations-hub',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './liquidations-hub.html',
})
export class LiquidationsHub implements OnInit {

  openPeriodsCount: number = 0;
  reviewedPeriodsCount: number = 0;

  private liquidationService = inject(LiquidationService);
  private cdr = inject(ChangeDetectorRef);

  ngOnInit() {
    this.loadPendingCounts();
  }

  loadPendingCounts() {

    this.liquidationService.getPeriods('open').subscribe({
      next: (res) => {
        this.openPeriodsCount = res.length;
        this.cdr.detectChanges();
      },
      error: (err) => console.error('Error al cargar periodos abiertos', err)
    });


    this.liquidationService.getPeriods('reviewed').subscribe({
      next: (res) => {
        this.reviewedPeriodsCount = res.length;
        this.cdr.detectChanges();
      },
      error: (err) => console.error('Error al cargar periodos en revisión', err)
    });
  }
}