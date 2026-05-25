import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BaseCard } from '../../components/base-card/base-card';

import { AuthService } from '../../core/auth/auth.service';
import { AssociateService } from '../../services/associate-service';
import { Associate, AssociateVariant } from '../../interfaces/Associate';
import { Loader } from '../../components/loader/loader';
import { LiquidationService } from '../../services/liquidation-service';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, BaseCard, Loader],
  templateUrl: './profile.html',
  styleUrl: './profile.css',
})
export class Profile implements OnInit {
  associate: Associate | null = null;
  error: string | null = null;
  loading: boolean = true;
  modules: AssociateVariant[] = [];
  hoursWorked: number = 0;

  constructor(
    private readonly authService: AuthService,
    private readonly associateService: AssociateService,
    private readonly liquidationService: LiquidationService,
    private readonly cdr: ChangeDetectorRef
  ) { }

  ngOnInit() {
    this.loading = true;
    this.error = null;
    const user = this.authService.currentUser();

    if (!user) {
      this.error = 'No se encontró el usuario autenticado.';
      return;
    }

    this.associateService.getAssociateByUser(user.id).subscribe({
      next: (associates) => {
        if (associates && associates.length > 0) {
          this.associate = associates[0];
          this.modules = this.associate.variants;
          console.log('Módulos asociados:', this.modules);
        } else {
          this.error = 'No se encontró el asociado para este usuario.';
        }
        this.loading = false;
        this.cdr.detectChanges();

      },
      error: () => {
        this.error = 'No se pudo cargar la información del perfil.';
        this.loading = false;
        this.cdr.detectChanges();

      },
    });

    this.liquidationService.getPeriods('reviewed').subscribe({
      next: (res) => {
        console.log('Periodos en revisión:', res);

        // Buscar el período con el mes más alto
        const latestPeriod = res.reduce((prev, current) =>
          current.month > prev.month ? current : prev
        );

        const selectedPeriodId = latestPeriod?.id;

        console.log('Último período:', latestPeriod);
        if (selectedPeriodId) {

          this.liquidationService.calculate(selectedPeriodId, true).subscribe({
            next: (result) => {
              console.log(result);

              const currentUserRetirement = result.retirements.find(
                (retirement: any) => retirement.associate_id === this.associate?.id
              );

              console.log('Retirement usuario actual:', currentUserRetirement);

              this.hoursWorked = currentUserRetirement?.hours_worked || 0;

              console.log('Horas trabajadas:', this.hoursWorked);

              this.cdr.detectChanges();
            },
            error: (err) => console.error('Error al calcular liquidación', err)
          });
        }
      },
      error: (err) => console.error('Error al cargar periodos en revisión', err)
    });
  }
}