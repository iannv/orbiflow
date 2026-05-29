import { ChangeDetectorRef, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { RolEnum } from '../../../enums/rolEnum';
import { ModulosService } from '../../../services/modulos-service';
import { AuthService } from '../../../core/auth/auth.service';
import { UserService } from '../../../services/user-service';
import { BaseCard } from '../../../components/base-card/base-card';
import { LiquidationService } from '../../../services/liquidation-service';
import { LiquidationPeriod } from '../../../interfaces/Liquidation';
import { Chip } from '../../../components/chip/chip';
import { formatCurrency } from '../../../shared/utils/formatCurrency';

@Component({
  selector: 'app-panel-admin',
  imports: [BaseCard, RouterLink, Chip],
  templateUrl: './panel-admin.html',
  styleUrl: './panel-admin.css',
})
export class PanelAdmin {
  asociadosActivos: number = 0;
  totalAsociados: number = 0;

  modulosActivos: number = 0;
  totalModulos: number = 0;

  liquidacionActual?: LiquidationPeriod;
  estadoLiquidacion: string = 'Sin período activo';

  totalLiquidado: string = '0,00';
  periodoLiquidado: string = 'Sin liquidaciones cerradas';

  recibosGenerados: number = 0;

  usuariosRegistrados: number = 0;

  ultimaLiquidacion?: LiquidationPeriod;

  role = RolEnum;
  admin: boolean = false;
  tressurer: boolean = false;
  associate: boolean = false;

  constructor(
    private moduloService: ModulosService,
    private usersService: UserService,
    private liquidationService: LiquidationService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit() {
    this.getActiveModules();
    this.getTotalModules();

    this.getTotalAssociates();
    this.getActiveAssociates();

    this.getActualLiquidation();

    this.getTotalUsers();
    this.getLastLiquidation();
  }

  // Obtener modulos activos
  getActiveModules() {
    this.moduloService.getModulos().subscribe((modules) => {
      this.modulosActivos = modules.filter((m) => m.is_active).length;
      this.cdr.detectChanges();
    });
  }

  // Obtener total de modulos (activos e inactivos)
  getTotalModules() {
    this.moduloService.getModulos().subscribe((modules) => {
      this.totalModulos = modules.length;
      this.cdr.detectChanges();
    });
  }

  // Obtener asociados activos
  getActiveAssociates() {
    this.usersService.getUsers().subscribe((users) => {
      this.asociadosActivos = users.filter((u) => u.role === 'associate' && u.is_active).length;
      this.cdr.detectChanges();
    });
  }

  // Obtener todos los asociados (activos e inactivos)
  getTotalAssociates() {
    this.usersService.getUsers().subscribe((users) => {
      this.totalAsociados = users.filter((u) => u.role === 'associate').length;
      this.cdr.detectChanges();
    });
  }

  // Obtener liquidación actual
  liquidacionChipColorName: string = '';
  liquidacionChipColorBg: string = '';
  getActualLiquidation() {
    this.liquidationService.getPeriods().subscribe((period) => {
      this.liquidacionActual = period.find((p) => p.status === 'open' || p.status === 'reviewed');
      if (this.liquidacionActual?.status === 'open') {
        this.estadoLiquidacion = 'Abierto';
        this.liquidacionChipColorName = 'var(--verde-selva)';
        this.liquidacionChipColorBg = 'var(--verde-bg)';
      } else if (this.liquidacionActual?.status === 'reviewed') {
        this.estadoLiquidacion = 'En revisión';
        this.liquidacionChipColorName = 'var(--ambar)';
        this.liquidacionChipColorBg = 'var(--ambar-bg)';
      } else {
        this.estadoLiquidacion = 'Cerrado';
        this.liquidacionChipColorName = 'var(--rojo)';
        this.liquidacionChipColorBg = 'var(--rojo-bg)';
      }

      // Total de la liquidación
      if (this.liquidacionActual?.id) this.getTotalRetirements(this.liquidacionActual.id);
    });
  }

  // Información del sistema
  getTotalUsers() {
    this.usersService.getUsers().subscribe((users) => {
      this.usuariosRegistrados = users.length;
      this.cdr.detectChanges();
    });
  }

  // Última liquidación
  getLastLiquidation() {
    this.liquidationService.getPeriods().subscribe((period) => {
      this.ultimaLiquidacion = period
        .filter((p) => p.status === 'closed')
        .sort((a, b) => {
          if (a.year !== b.year) return b.year - a.year;
          return b.month - a.month;
        })[0];
      if (this.ultimaLiquidacion?.id) this.getTotalRetirements(this.ultimaLiquidacion.id);
    });
  }

  getTotalRetirements(liquidationId: number) {
    this.liquidationService.getSummary(liquidationId).subscribe((summary) => {
      // Obtener la cantidad de recibos generados en la última liquidación cerrada
      this.recibosGenerados = summary.retirements_count;
      // Obtener monto total de la liquidación
      this.totalLiquidado = formatCurrency(summary.totals.total_amount);
      this.cdr.detectChanges();
    });
  }
}
