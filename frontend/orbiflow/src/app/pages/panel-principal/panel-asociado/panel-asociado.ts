import { ChangeDetectorRef, Component } from '@angular/core';
import { BaseCard } from '../../../components/base-card/base-card';
import { RouterLink } from '@angular/router';
import { RolEnum } from '../../../enums/rolEnum';
import { AssociateService } from '../../../services/associate-service';
import { AuthService } from '../../../core/auth/auth.service';

@Component({
  selector: 'app-panel-asociado',
  imports: [BaseCard, RouterLink],
  templateUrl: './panel-asociado.html',
  styleUrl: './panel-asociado.css',
})
export class PanelAsociado {
  lastWithdrawal: number = 0;
  dateLastWithdrawal: string = 'Sin registro';

  totalHoursWorked: number = 0;
  period: string = 'Sin registro';

  seniority: number = 0;
  entryDate: string = 'Sin registro';

  periodStatus: number = 0;

  role = RolEnum;

  constructor(
    private cdr: ChangeDetectorRef,
    private authService: AuthService,
    private associateService: AssociateService,
  ) {}

  ngOnInit() {
    this.getSeniority();
  }

  // Obtener último retiro
  getLastWithdrawal() {}

  // Obtener horas trabajadas del mes
  getTotalHoursWorked() {}

  // Obtener antigüedad
  getSeniority() {
    console.log(this.authService.currentUser());
    const associateId = this.authService.currentUser()?.id;
    if (!associateId) return;
    this.associateService.getAssociateByUser(associateId).subscribe((associate) => {
      console.log('Antes de contar:', this.entryDate);
      if (associate.length > 0) {
        this.entryDate = associate[0].entry_date;
        this.cdr.detectChanges();
        console.log('Fecha de ingreso del asociado:', this.entryDate);
      }
    });
  }

  // Obtener estado del período
  getPeriodStatus() {}
}
