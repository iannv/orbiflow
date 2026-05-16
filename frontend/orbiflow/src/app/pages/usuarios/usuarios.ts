import { Component, OnInit, DoCheck, ChangeDetectorRef } from '@angular/core';
import { BaseCard } from '../../components/base-card/base-card';
import { Chip } from '../../components/chip/chip';
import { Action } from '../../components/button/action/action';
import { User } from '../../interfaces/User';
import { UserService } from '../../services/user-service';
import { Primary } from '../../components/button/primary/primary';
import { Router } from '@angular/router';
import { Modal } from '../../components/modal/modal';
import { input } from '../../components/input/input';
import { Select } from '../../components/select/select';
import { RolEnum } from '../../enums/rolEnum';

@Component({
  selector: 'app-usuarios',
  imports: [BaseCard, Chip, Action, Primary, Modal, input, Select],
  templateUrl: './usuarios.html',
  styleUrl: './usuarios.css',
})
export class Usuarios implements OnInit {
  constructor(
    private userService: UserService,
    private cdr: ChangeDetectorRef,
  ) {}

  userList: User[] = [];
  roles = Object.values(RolEnum);
  nameUser: string = '';
  user: string = '';

  chipName: string = '';
  chipColorName: string = '';
  chipBackgroundColor: string = '';

  // var(--rojo-bg)

  ngOnInit() {
    this.getUsers();

    
  }

  getUsers() {
    this.userService.getUsers().subscribe((users) => {
      this.userList = users;
      this.cdr.detectChanges();
    });
  }

  // Modal
  isModalOpen = false;
  openModal() {
    this.isModalOpen = true;
  }
  closeModal() {
    this.isModalOpen = false;
  }
}
