import { Component, ChangeDetectorRef } from '@angular/core';

import { BaseCard } from '../../components/base-card/base-card';
import { RouterLink } from '@angular/router';
import { ModulosService } from '../../services/modulos-service';
import { AssociateService } from '../../services/associate-service';
import { UserService } from '../../services/user-service';

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

  constructor(
    private moduloService: ModulosService,
    private associateService: AssociateService,
    private usersService: UserService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit() {
    this.getActiveModules();
    this.getTotalModules();

    this.getTotalAssociates();
    // this.getActiveAssociates();

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
  // getActiveAssociates(){
  //   this.associateService.getAssociates().subscribe((associates) => {
  //     this.asociadosActivos = associates.filter(a => a.is_active)
  //   })
  // }

  // Obtener todos los asociados (activos e inactivos)
  getTotalAssociates() {
    this.associateService.getAssociates().subscribe((associates) => {
      this.totalAsociados = associates.length;
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
