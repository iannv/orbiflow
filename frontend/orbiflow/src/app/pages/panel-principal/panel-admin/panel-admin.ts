import { ChangeDetectorRef, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { RolEnum } from '../../../enums/rolEnum';
import { ModulosService } from '../../../services/modulos-service';
import { AuthService } from '../../../core/auth/auth.service';
import { UserService } from '../../../services/user-service';
import { BaseCard } from "../../../components/base-card/base-card";

@Component({
  selector: 'app-panel-admin',
  imports: [BaseCard, RouterLink],
  templateUrl: './panel-admin.html',
  styleUrl: './panel-admin.css',
})
export class PanelAdmin {
  asociadosActivos: number = 0;
  totalAsociados: number = 0;

  modulosActivos: number = 0;
  totalModulos: number = 0;

  liquidacionesMes: number = 0;
  fechaLiquidaciones: string = 'Sin registro';

  recibosGenerados: number = 0;

  usuariosRegistrados: number = 0;
  ultimaLiquidacion: string = '';

  role = RolEnum;
  admin: boolean = false;
  tressurer: boolean = false;
  associate: boolean = false;

  constructor(
    private moduloService: ModulosService,
    private usersService: UserService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit() {
    this.getActiveModules();
    this.getTotalModules();

    this.getTotalAssociates();
    this.getActiveAssociates();

    this.getTotalUsers();
    // this.getLastLiquidation();
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
  // TODO: agregar a la interfaz el atr is_active
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

  // !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
  // !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
  // TODO
  // getMonthLiquidations() {}
  // getTotalRetirements() {}

  // Información del sistema
  getTotalUsers() {
    this.usersService.getUsers().subscribe((users) => {
      this.usuariosRegistrados = users.length;
      this.cdr.detectChanges();
    });
  }

  // !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
  // TODO
  // getLastLiquidation() {}

}
