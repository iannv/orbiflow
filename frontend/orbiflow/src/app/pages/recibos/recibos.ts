import { Component } from '@angular/core';
import { BaseCard } from "../../components/base-card/base-card";

@Component({
  selector: 'app-recibos',
  imports: [BaseCard],
  templateUrl: './recibos.html',
  styleUrl: './recibos.css',
})
export class Recibos {
  year: string = '';
  arrow: string = 'assets/flecha-abajo.png'; // Si collapse false la flecha es hacia la derecha

  collapse: boolean = false;

  // ngOnInit(){
  //   this.isCollapse();
  // }

  // isCollapse() {
  //   this.collapse = this.collapse != this.collapse;
  //   this.arrow = 'assets/flecha-derecha.png';
  // }
}
