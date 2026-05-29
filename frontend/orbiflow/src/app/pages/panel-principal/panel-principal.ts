import { Component, ChangeDetectorRef } from '@angular/core';

import { BaseCard } from '../../components/base-card/base-card';
import { ModulosService } from '../../services/modulos-service';
import { UserService } from '../../services/user-service';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { RolEnum } from '../../enums/rolEnum';
import { User } from '../../interfaces/User';
import { AuthService } from '../../core/auth/auth.service';
import { PanelAsociado } from "./panel-asociado/panel-asociado";
import { PanelAdmin } from "./panel-admin/panel-admin";

@Component({
  selector: 'app-panel-principal',
  standalone: true,
  imports: [BaseCard, RouterLink, PanelAsociado, PanelAdmin],
  templateUrl: './panel-principal.html',
  styleUrl: './panel-principal.css',
})
export class PanelPrincipal {
  role = RolEnum;
  admin: boolean = false;
  tressurer: boolean = false;
  associate: boolean = false;

  constructor(
    private route: ActivatedRoute,
    private authService: AuthService,
  ) {}

  ngOnInit() {
    this.isAdmin();
    this.isTressurer();
    this.isAssociate();
  }

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

  // getPanelInfo() {
  //   const role = this.authService.currentUser()?.role;

  //   if (role === 'admin' || role === 'treasurer') {
  //     return {
  //       subtitle: 'Gestión completa del sistema',
  //     };
  //   }
  //   return {
  //     subtitle: 'Sistema de Gestión Cooperativa',
  //   };
  // }
}
