import { ChangeDetectorRef, Component } from '@angular/core';
import { BaseCard } from '../../../components/base-card/base-card';
import { RouterLink } from '@angular/router';
import { RolEnum } from '../../../enums/rolEnum';
import { AssociateService } from '../../../services/associate-service';
import { AuthService } from '../../../core/auth/auth.service';
import { LiquidationService } from '../../../services/liquidation-service';
import { formatCurrency } from '../../../shared/utils/formatCurrency';
import { LiquidationPeriod, LiquidationSummary } from '../../../interfaces/Liquidation';
import { Retirement } from '../../../interfaces/Retirement';
import { RetirementService } from '../../../services/retirement-service';
import { User } from '../../../interfaces/User';
import { last } from 'rxjs';

@Component({
  selector: 'app-panel-asociado',
  imports: [BaseCard, RouterLink],
  templateUrl: './panel-asociado.html',
  styleUrl: './panel-asociado.css',
})
export class PanelAsociado {
  lastRetirement?: Retirement;
  lastWithdrawal: string = '0,00';
  dateLastWithdrawal: LiquidationPeriod | string = 'No hay retiros';

  totalHoursWorked: number = 0;
  period: any | string = 'Sin registro';

  seniority: number = 0;
  entryDate: string = 'Sin registro';

  periodStatus: number = 0;

  role = RolEnum;

  constructor(
    private cdr: ChangeDetectorRef,
    private authService: AuthService,
    private associateService: AssociateService,
    private liquidationService: LiquidationService,
    private retirementService: RetirementService,
  ) {}

  ngOnInit() {
    this.getSeniority();
    this.getLastRetirement(1);
  }

  // Último retiro
  getLastRetirement(userId: number) {
    this.retirementService.getRetirementsByAssociate(userId).subscribe((retirement) => {
      this.lastRetirement = retirement.sort((a, b) => b.id - a.id)[0];
      this.lastWithdrawal = formatCurrency(this.lastRetirement.total_amount);

      this.liquidationService.getPeriods().subscribe((period) => {
        const liquidation = period.find((p) => p.id === this.lastRetirement?.liquidation);
        this.dateLastWithdrawal = `${liquidation?.month}/${liquidation?.year}`;

        if (liquidation) {
          const months = [
            'Enero',
            'Febrero',
            'Marzo',
            'Abril',
            'Mayo',
            'Junio',
            'Julio',
            'Agosto',
            'Septiembre',
            'Octubre',
            'Noviembre',
            'Diciembre',
          ];
          this.period = `${months[liquidation.month - 1]}`;
        }
        this.cdr.detectChanges();
      });
      this.cdr.detectChanges();
    });
  }

  // Obtener antigüedad
  getSeniority() {
    console.log(this.authService.currentUser());
    const associateId = this.authService.currentUser()?.id;
    if (!associateId) return;
    this.associateService.getAssociateByUser(associateId).subscribe((associate) => {
      if (associate.length > 0) {
        this.entryDate = associate[0].entry_date;
        this.cdr.detectChanges();
      }
    });
  }

  // Obtener estado del período
  getPeriodStatus() {}
}
