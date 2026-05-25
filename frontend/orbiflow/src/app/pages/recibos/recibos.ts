import { ChangeDetectorRef, Component, ViewChild } from '@angular/core';
import { BaseCard } from '../../components/base-card/base-card';
import { Primary } from '../../components/button/primary/primary';
import { RetirementService } from '../../services/retirement-service';
import { Retirement } from '../../interfaces/Retirement';
import { AuthService } from '../../core/auth/auth.service';
import { AssociateService } from '../../services/associate-service';
import { LiquidationService } from '../../services/liquidation-service';
import { LiquidationPeriod } from '../../interfaces/Liquidation';

@Component({
  selector: 'app-recibos',
  imports: [BaseCard, Primary],
  templateUrl: './recibos.html',
  styleUrl: './recibos.css',
})
export class Recibos {
  arrow: string = 'assets/flecha-derecha.png';
  month: number = 0;
  amount: number = 0;

  retirementsList: Retirement[] = [];
  periodsList: LiquidationPeriod[] = [];
  yearList: number[] = [];

  @ViewChild('collapseElement') collapseElement: any;

  constructor(
    private cdr: ChangeDetectorRef,
    private retirementService: RetirementService,
    private authService: AuthService,
    private associateService: AssociateService,
    private liquidationService: LiquidationService,
  ) {}

  ngOnInit() {
    this.getRetirements();
  }

  ngAfterViewInit() {
    this.isCollapse();
  }

  // Colapsar card
  isCollapse() {
    const element = this.collapseElement.nativeElement;
    element.addEventListener('shown.bs.collapse', () => {
      this.arrow = 'assets/flecha-abajo.png';
      this.cdr.detectChanges();
    });
    element.addEventListener('hidden.bs.collapse', () => {
      this.arrow = 'assets/flecha-derecha.png';
      this.cdr.detectChanges();
    });
  }

  // Obtener recibos de un asociado
  getRetirements() {
    const user = this.authService.currentUser();
    if (!user) return;

    this.associateService.getAssociateByUser(user.id).subscribe((associate) => {
      if (associate.length === 0) return;

      const associateId = associate[0].id;

      this.retirementService.getRetirementsByAssociate(associateId).subscribe((retirements) => {
        this.retirementsList = retirements;

        this.liquidationService.getPeriods().subscribe((periods) => {
          this.periodsList = periods;
          this.getYears();
          this.cdr.detectChanges();
        });
      });
    });
  }

  // Obtener período completo de mes y año de la liquidación
  getPeriod(retirement: Retirement): string {
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
    const period = this.periodsList.find((p) => p.id === retirement.liquidation);
    if (!period || period.month == null || period.year == null) {
      return '';
    }
    const monthIndex = period.month - 1;
    const monthName = months[monthIndex] ?? '';
    return monthName ? `${monthName} ${period.year}` : '';
  }

  // Obtener solo los años en un array
  getYears() {
    const years = this.periodsList.map((p) => p.year);
    this.yearList = [...new Set(years)];
  }

  // Obtener los recibos de cada año
  getRetirementsByYear(year: number): Retirement[] {
    return this.retirementsList.filter((retirement) => {
      // TODO: MODIFICAR PARA QUE SEAN SOLOS LOS DE ESTADO CERRADO
      const period = this.periodsList.find((p) => p.id === retirement.liquidation);
      return period?.year === year;
    });
  }
}
