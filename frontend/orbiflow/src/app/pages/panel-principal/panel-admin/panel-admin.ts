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
import { Loader } from "../../../components/loader/loader";
import { AssociateService } from '../../../services/associate-service';

@Component({
  selector: 'app-panel-admin',
  imports: [BaseCard, RouterLink, Chip, Loader],
  templateUrl: './panel-admin.html',
  styleUrl: './panel-admin.css',
})
export class PanelAdmin {
  loading = true;
  private pendingRequests = 7;

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
    private authService: AuthService,
    private moduloService: ModulosService,
    private usersService: UserService,
    private liquidationService: LiquidationService,
    private associateService: AssociateService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit() {
    this.pendingRequests = 7;
    this.loading = true;

    this.getActiveModules();
    this.getTotalModules();

    this.getTotalAssociates();
    this.getActiveAssociates();

    this.getActualLiquidation();

    this.getTotalUsers();
    this.getLastLiquidation();
  }

  isAdmin() {
    return this.authService.currentUser()?.role === 'admin';
  }

  isTressurer() {
    return this.authService.currentUser()?.role === 'treasurer';
  }

  private markRequestComplete() {
    this.pendingRequests = Math.max(0, this.pendingRequests - 1);
    if (this.pendingRequests === 0) {
      this.loading = false;
      this.cdr.detectChanges();
    }
  }

  // Obtener modulos activos
  getActiveModules() {
    this.moduloService.getModulos().subscribe({
      next: (modules) => {
        this.modulosActivos = modules.filter((m) => m.is_active).length;
        this.cdr.detectChanges();
      },
      error: () => {},
      complete: () => this.markRequestComplete(),
    });
  }

  // Obtener total de modulos (activos e inactivos)
  getTotalModules() {
    this.moduloService.getModulos().subscribe({
      next: (modules) => {
        this.totalModulos = modules.length;
        this.cdr.detectChanges();
      },
      error: () => {},
      complete: () => this.markRequestComplete(),
    });
  }

  // Obtener asociados activos
  getActiveAssociates() {
    this.associateService.getAssociates().subscribe({
      next: (associates) => {
        this.asociadosActivos = associates.filter((a) => a.is_active).length;
        this.cdr.detectChanges();
      },
      error: () => {},
      complete: () => this.markRequestComplete(),
    });
  }

  // Obtener todos los asociados (activos e inactivos)
  getTotalAssociates() {
    this.associateService.getAssociates().subscribe({
      next: (associates) => {
        this.totalAsociados = associates.length;
        this.cdr.detectChanges();
      },
      error: () => {},
      complete: () => this.markRequestComplete(),
    });
  }

  // Obtener liquidación actual
  liquidacionChipColorName: string = '';
  liquidacionChipColorBg: string = '';
  getActualLiquidation() {
    this.liquidationService.getPeriods().subscribe({
      next: (period) => {
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

        if (this.liquidacionActual?.id) {
          this.pendingRequests += 1;
          this.getTotalRetirements(this.liquidacionActual.id);
        }
      },
      error: () => {},
      complete: () => this.markRequestComplete(),
    });
  }

  // Información del sistema
  getTotalUsers() {
    this.usersService.getUsers().subscribe({
      next: (users) => {
        // Filtro para no contar a los superusers
        this.usuariosRegistrados = users.filter((u) => !u.is_superuser).length;
        this.cdr.detectChanges();
      },
      error: () => {},
      complete: () => this.markRequestComplete(),
    });
  }

  // Última liquidación
  getLastLiquidation() {
    this.liquidationService.getPeriods().subscribe({
      next: (period) => {
        this.ultimaLiquidacion = period
          .filter((p) => p.status === 'closed')
          .sort((a, b) => {
            if (a.year !== b.year) return b.year - a.year;
            return b.month - a.month;
          })[0];
        if (this.ultimaLiquidacion?.id) {
          this.pendingRequests += 1;
          this.getTotalRetirements(this.ultimaLiquidacion.id);
        }
      },
      error: () => {},
      complete: () => this.markRequestComplete(),
    });
  }

  getTotalRetirements(liquidationId: number) {
    this.liquidationService.getSummary(liquidationId).subscribe({
      next: (summary) => {
        this.recibosGenerados = summary.retirements_count;
        this.totalLiquidado = formatCurrency(summary.totals.total_amount);
        this.cdr.detectChanges();
      },
      error: () => {},
      complete: () => this.markRequestComplete(),
    });
  }
}
