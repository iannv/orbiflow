import { Component, OnInit, DoCheck, ChangeDetectorRef } from '@angular/core';
import { BaseCard } from '../../components/base-card/base-card';
import { Chip } from '../../components/chip/chip';
import { Action } from '../../components/button/action/action';
import { User } from '../../interfaces/User';
import { UserService } from '../../services/user-service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-usuarios',
  imports: [BaseCard, CommonModule, Chip, Action],
  templateUrl: './usuarios.html',
  styleUrl: './usuarios.css',
})
export class Usuarios implements OnInit {
  constructor(private userService: UserService, private cdr: ChangeDetectorRef) {
    console.log('COMPONENTE CREADO', new Date().getTime());
  }
  ngDoCheck() {
    console.log('CAMBIO DETECTADO - userList:', this.userList.length);
  }

  userList: User[] = [];
  nameUser: string = '';
  user: string = '';
  backgroundColor: string = '';
  colorName: string = '';

  ngOnInit() {
    console.log('NGONINIT');
    this.userService.getUsers().subscribe((data) => {
      this.userList = data;
      console.log('ASIGNADO:', this.userList.length);
       this.cdr.detectChanges();
    });
  }

  // getUsers() {
  //   this.userService.getUsers().subscribe((users) => {
  //     console.log('USUARIOS RECIBIDOS:', users);
  //     this.userList = users;
  //     console.log('USUARIOS AHORA:', this.userList);
  //   });
  // }
}
