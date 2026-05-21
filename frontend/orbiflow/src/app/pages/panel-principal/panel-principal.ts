import { Component, ChangeDetectorRef } from '@angular/core';

import { BaseCard } from '../../components/base-card/base-card';
import { ModulosService } from '../../services/modulos-service';
import { UserService } from '../../services/user-service';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { RolEnum } from '../../enums/rolEnum';
import { User } from '../../interfaces/User';
import { AuthService } from '../../core/auth/auth.service';

@Component({
  selector: 'app-panel-principal',
  standalone: true,
  imports: [BaseCard, RouterLink],
  templateUrl: './panel-principal.html',
  styleUrl: './panel-principal.css',
})
export class PanelPrincipal {
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
    private route: ActivatedRoute,
    private authService: AuthService,
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

    this.isAdmin();
    this.isTressurer();
    this.isAssociate();
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

  // Roles del panel principal
  isAdmin() {
    return this.authService.currentUser()?.role === 'admin';
  }

  isTressurer() {
    return this.authService.currentUser()?.role === 'treasurer';
  }

  isAssociate() {
    return this.authService.currentUser()?.role === 'associate';
  }
}
