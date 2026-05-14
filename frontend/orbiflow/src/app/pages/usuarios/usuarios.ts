import { Component } from '@angular/core';
import { BaseCard } from "../../components/base-card/base-card";
import { Chip } from "../../components/chip/chip";
import { Action } from "../../components/button/action/action";

@Component({
  selector: 'app-usuarios',
  imports: [BaseCard, Chip, Action],
  templateUrl: './usuarios.html',
  styleUrl: './usuarios.css',
})
export class Usuarios {
  userList: string[] = []; // Cambiar a interfaz User
  totalUsers: number = 0;
  nameUser: string = '';
  user: string = '';

  
}
