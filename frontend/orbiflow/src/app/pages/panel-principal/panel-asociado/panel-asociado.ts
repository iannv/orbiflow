import { ChangeDetectorRef, Component } from '@angular/core';
import { BaseCard } from '../../../components/base-card/base-card';
import { RouterLink } from '@angular/router';
import { RolEnum } from '../../../enums/rolEnum';

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
  ) {}

  ngOnInit() {}

  // Obtener último retiro
  getLastWithdrawal() {}

  // Obtener horas trabajadas del mes
  getTotalHoursWorked() {}

  // Obtener antigüedad
  getSeniority() {}
  
  // Obtener estado del período
  getPeriodStatus() {}
}
