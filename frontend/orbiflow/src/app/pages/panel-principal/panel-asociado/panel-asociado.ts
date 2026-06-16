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
import { Loader } from '../../../components/loader/loader';
import { Associate } from '../../../interfaces/Associate';
import { formatDate } from '../../../shared/utils/formatDate';

@Component({
  selector: 'app-panel-asociado',
  imports: [BaseCard, RouterLink, Chip, Loader],
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

  loading = true;
  private pendingRequests = 2;

  role = RolEnum;

  constructor(
    private cdr: ChangeDetectorRef,
    private authService: AuthService,
    private associateService: AssociateService,
    private liquidationService: LiquidationService,
    private retirementService: RetirementService,
  ) {}

  ngOnInit() {
    const currentUser = this.authService.currentUser();
    if (!currentUser) return;

    this.loading = true;
    this.pendingRequests = 2;

    this.loadAssociateInfo(currentUser.id);
    this.getPeriodStatus();
  }

  private loadAssociateInfo(userId: number) {
    this.associateService.getAssociateByUser(userId).subscribe({
      next: (associate) => {
        const associateData = associate[0];

        if (associateData) {
          this.setSeniority(associateData);
          this.getLastRetirement(associateData.id);
        } else {
          this.markRequestComplete();
        }
      },
      error: () => this.markRequestComplete(),
    });
  }

  private setSeniority(associate: Associate) {
    this.entryDate = formatDate(associate.entry_date);
    this.seniorityYear = associate.years_in_coop;

    const entryMonth = Number(this.entryDate.split('/')[1]);
    const actualMonth = new Date().getMonth() + 1;
    if (actualMonth >= entryMonth) {
      this.seniorityMonth = actualMonth - entryMonth;
    } else {
      this.seniorityMonth = 12 - (entryMonth - actualMonth);
    }

    this.cdr.detectChanges();
  }

  private markRequestComplete() {
    this.pendingRequests = Math.max(0, this.pendingRequests - 1);
    if (this.pendingRequests === 0) {
      this.loading = false;
      this.cdr.detectChanges();
    }
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
  getLastRetirement(associateId: number) {
    this.retirementService.getRetirementsByAssociate(associateId).subscribe({
      next: (retirements) => {
        if (!retirements.length) {
          this.lastRetirement = undefined;
          this.lastWithdrawal = '0';
          this.dateLastWithdrawal = 'Sin registro';
          this.period = 'Sin registro';
          this.markRequestComplete();
          return;
        }
        this.lastRetirement = retirements.sort((a, b) => b.id - a.id)[0];
        this.lastWithdrawal = formatCurrency(this.lastRetirement.total_amount);
        this.liquidationService.getPeriods().subscribe({
          next: (periods) => {
            const liquidation = periods.find((p) => p.id === this.lastRetirement?.liquidation);

            if (!liquidation) {
              this.dateLastWithdrawal = 'Sin registro';
              this.period = 'Sin registro';
              this.markRequestComplete();
              return;
            }
            this.dateLastWithdrawal = `${liquidation.month}/${liquidation.year}`;
            this.period = this.months[liquidation.month - 1];
            this.cdr.detectChanges();
            this.markRequestComplete();
          },
          error: () => this.markRequestComplete(),
        });
      },
      error: () => this.markRequestComplete(),
    });
  }

  // Obtener estado del período
  liquidacionChipColorName: string = '';
  liquidacionChipColorBg: string = '';
  getPeriodStatus() {
    this.liquidationService.getPeriods().subscribe({
      next: (period) => {
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
      this.markRequestComplete();
    },
    error: () => this.markRequestComplete(),
    });
  }
}
