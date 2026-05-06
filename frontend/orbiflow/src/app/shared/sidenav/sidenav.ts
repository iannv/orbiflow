import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-sidenav',
  imports: [],
  templateUrl: './sidenav.html',
  styleUrl: './sidenav.css',
})
export class Sidenav {
  @Input() sideNavStatus: boolean = false;

  @Output() sideNavToggled = new EventEmitter<boolean>();

  menuStatus: boolean = false;

  SideNavToggle() {
    this.menuStatus = !this.menuStatus;
    this.sideNavToggled.emit(this.menuStatus);
  }

  menu = [
    {
      id: '0',
      name: 'Panel principal',
      iconName: 'assets/panel-principal.png',
      route: '#',
    },
    {
      id: '1',
      name: 'Usuarios',
      iconName: 'assets/usuarios.png',
      route: '#',
    },
    {
      id: '2',
      name: 'Asociados',
      iconName: 'assets/asociados.png',
      route: '#',
    },
    {
      id: '3',
      name: 'Módulos',
      iconName: 'assets/modulo.png',
      route: '#',
    },
    {
      id: '4',
      name: 'Liquidaciones',
      iconName: 'assets/liquidaciones.png',
      route: '#',
    },
    {
      id: '5',
      name: 'Recibos',
      iconName: 'assets/recibos.png',
      route: '#',
    },
    {
      id: '6',
      name: 'Configuración',
      iconName: 'assets/configuracion.png',
      route: '#',
    },
    {
      id: '7',
      name: 'Mi perfil',
      iconName: 'assets/mi-perfil.png',
      route: '#',
    },
    {
      id: '8',
      name: 'Archivo cooperativo',
      iconName: 'assets/archivo-coop.png',
      route: '#',
    },

  ];
}
