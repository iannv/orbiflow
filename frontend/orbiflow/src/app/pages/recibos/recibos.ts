import { ChangeDetectorRef, Component, ViewChild } from '@angular/core';
import { BaseCard } from '../../components/base-card/base-card';
import { Primary } from '../../components/button/primary/primary';
import { RetirementService } from '../../services/retirement-service';
import { Retirement } from '../../interfaces/Retirement';
import { AuthService } from '../../core/auth/auth.service';
import { AssociateService } from '../../services/associate-service';
import { LiquidationService } from '../../services/liquidation-service';
import { LiquidationPeriod } from '../../interfaces/Liquidation';
import { Router } from '@angular/router';
import { PdfGeneratorService } from '../../services/pdf-service';
import { retirementPDF } from '../../shared/pdf-templates/retirementsPDF';

@Component({
  selector: 'app-recibos',
  imports: [BaseCard, Primary],
  templateUrl: './recibos.html',
  styleUrl: './recibos.css',
})
export class Recibos {
  retirementsList: Retirement[] = [];
  periodsList: LiquidationPeriod[] = [];
  yearList: number[] = [];

  constructor(
    private cdr: ChangeDetectorRef,
    private router: Router,
    private retirementService: RetirementService,
    private authService: AuthService,
    private associateService: AssociateService,
    private liquidationService: LiquidationService,
    private pdfService: PdfGeneratorService,
  ) {}

  ngOnInit() {
    this.getRetirements();
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
    this.yearList = [...new Set(years)].sort((a, b) => b - a);
  }

  // Obtener los recibos de cada mes y año, ordenados por mes descendiente
  getRetirementsByYear(year: number): Retirement[] {
    return this.retirementsList
      .filter((retirement) => {
        const period = this.periodsList.find((p) => p.id === retirement.liquidation);
        if (period?.status !== 'closed') return false;
        return period?.year === year;
      })
      .sort((a, b) => {
        const periodA = this.periodsList.find((p) => p.id === a.liquidation);
        const periodB = this.periodsList.find((p) => p.id === b.liquidation);
        return (periodB?.month ?? 0) - (periodA?.month ?? 0);
      });
  }

  // Abrir y visualizar recibo
  viewPDF(){
    this.pdfService.abrirEnPestania(retirementPDF);
  }



  // Descargar recibo en PDF
  downloadPDF(){}


}
