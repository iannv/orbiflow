import { ChangeDetectorRef, Component } from '@angular/core';
import { BaseCard } from '../../../components/base-card/base-card';
import { RouterLink } from '@angular/router';
import { RolEnum } from '../../../enums/rolEnum';
import { AssociateService } from '../../../services/associate-service';
import { AuthService } from '../../../core/auth/auth.service';
import { LiquidationService } from '../../../services/liquidation-service';
import { formatCurrency } from '../../../shared/utils/formatCurrency';
import { LiquidationPeriod } from '../../../interfaces/Liquidation';
import { Retirement } from '../../../interfaces/Retirement';
import { RetirementService } from '../../../services/retirement-service';
import { Chip } from '../../../components/chip/chip';
import { Associate } from '../../../interfaces/Associate';
import { formatDate } from '../../../shared/utils/formatDate';

@Component({
  selector: 'app-panel-asociado',
  imports: [BaseCard, RouterLink, Chip],
  templateUrl: './panel-asociado.html',
  styleUrl: './panel-asociado.css',
})
export class PanelAsociado {
  lastRetirement?: Retirement;
  lastWithdrawal: string = '0,00';
  dateLastWithdrawal: LiquidationPeriod | string = 'No hay retiros';

  totalHoursWorked: number = 0;
  period: any | string = 'Sin registro';
  currentPeriod: any;

  seniorityYear: number = 0;
  seniorityMonth: number = 0;
  entryDate: string = '';

  periodStatus: LiquidationPeriod | string = 'Desconocido';

  role = RolEnum;

  constructor(
    private cdr: ChangeDetectorRef,
    private authService: AuthService,
    private associateService: AssociateService,
    private liquidationService: LiquidationService,
    private retirementService: RetirementService,
  ) {}

  ngOnInit() {
    const user = this.authService.currentUser();
    if (!user) return;
    this.getLastRetirement(user.id);
    this.getSeniority();

    this.getPeriodStatus();
  }

  months = [
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

  // Último retiro
  getLastRetirement(userId: number) {
    this.retirementService.getRetirementsByAssociate(userId).subscribe((retirement) => {
      this.lastRetirement = retirement.sort((a, b) => b.id - a.id)[0];
      this.lastWithdrawal = formatCurrency(this.lastRetirement.total_amount);

      this.liquidationService.getPeriods().subscribe((period) => {
        const liquidation = period.find((p) => p.id === this.lastRetirement?.liquidation);
        this.dateLastWithdrawal = `${liquidation?.month}/${liquidation?.year}`;

        if (liquidation) this.period = `${this.months[liquidation.month - 1]}`;

        this.cdr.detectChanges();
      });
      this.cdr.detectChanges();
    });
  }

  // Obtener antigüedad
  getSeniority() {
    const userId = this.authService.currentUser()?.id;
    if (!userId) return;
    this.associateService.getAssociateByUser(userId).subscribe((associate) => {
      const associateDate = associate[0];
      this.entryDate = formatDate(associateDate.entry_date);
      this.seniorityYear = associateDate.years_in_coop;

      const entryMonth = Number(this.entryDate.split('/')[1]);
      const actualMonth = new Date().getMonth() + 1;
      if (actualMonth >= entryMonth) {
        this.seniorityMonth = actualMonth - entryMonth;
      } else {
        this.seniorityMonth= 12 - (entryMonth - actualMonth);
      }

      this.cdr.detectChanges();
    });
  }

  // Obtener estado del período
  liquidacionChipColorName: string = '';
  liquidacionChipColorBg: string = '';
  getPeriodStatus() {
    this.liquidationService.getPeriods().subscribe((period) => {
      const latestPeriod = period[0];
      this.currentPeriod = this.months[latestPeriod.month - 1];
      this.periodStatus = latestPeriod.status;

      switch (this.periodStatus) {
        case 'open':
          this.periodStatus = 'Abierto';
          this.liquidacionChipColorName = 'var(--verde-selva)';
          this.liquidacionChipColorBg = 'var(--verde-bg)';
          break;

        case 'reviewed':
          this.periodStatus = 'En revisión';
          this.liquidacionChipColorName = 'var(--ambar)';
          this.liquidacionChipColorBg = 'var(--ambar-bg)';
          break;

        case 'closed':
          this.periodStatus = 'Cerrado';
          this.liquidacionChipColorName = 'var(--rojo)';
          this.liquidacionChipColorBg = 'var(--rojo-bg)';
          break;

        default:
          this.periodStatus = 'Desconocido';
      }
      this.cdr.detectChanges();
    });
  }
}
