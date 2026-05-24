import { Component, EventEmitter, Input, Output } from '@angular/core';
import { NgClass } from "@angular/common";
import { RouterLink, RouterLinkActive } from "@angular/router";

@Component({
  selector: 'app-sidenav',
  imports: [NgClass, RouterLink, RouterLinkActive],
  templateUrl: './sidenav.html',
  styleUrl: './sidenav.css',
})
export class Sidenav {
  @Input() isExpanded: boolean = false;
  @Output() toggleSidebar: EventEmitter<boolean> = new EventEmitter<boolean>();

  handleSidebarToggle = () => this.toggleSidebar.emit(!this.isExpanded);

    menu = [
    {
      id: '0',
      name: 'Panel principal',
      iconName: 'assets/panel-principal.png',
      route: '/panel',
    },
    {
      id: '1',
      name: 'Usuarios',
      iconName: 'assets/usuarios.png',
      route: '/usuarios',
    },
    {
      id: '2',
      name: 'Asociados',
      iconName: 'assets/asociados.png',
      route: '/asociados',
    },
    {
      id: '3',
      name: 'Módulos',
      iconName: 'assets/modulo.png',
      route: '/modulos',
    },
    {
      id: '4',
      name: 'Liquidaciones',
      iconName: 'assets/liquidaciones.png',
      route: '/liquidaciones',
    },
    {
      id: '5',
      name: 'Recibos',
      iconName: 'assets/recibos.png',
      route: 'recibos',
    },
    {
      id: '6',
      name: 'Configuración',
      iconName: 'assets/configuracion.png',
      route: '/configuracion-general',
    },
    {
      id: '7',
      name: 'Mi perfil',
      iconName: 'assets/mi-perfil.png',
      route: '/profile',
    },
    {
      id: '8',
      name: 'Archivo cooperativo',
      iconName: 'assets/archivo-coop.png',
      route: '#',
    },
  ]
}
