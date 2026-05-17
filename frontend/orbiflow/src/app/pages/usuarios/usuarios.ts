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
import { FormBuilder, FormGroup, Validators, ɵInternalFormsSharedModule } from '@angular/forms';

@Component({
  selector: 'app-usuarios',
  imports: [BaseCard, Chip, Action, Primary, Modal, input, Select, ɵInternalFormsSharedModule],
  templateUrl: './usuarios.html',
  styleUrl: './usuarios.css',
})
export class Usuarios implements OnInit {
  constructor(
    private userService: UserService,
    private formBuilder: FormBuilder,
    private cdr: ChangeDetectorRef,
  ) {}

  userForm!: FormGroup;
  userList: User[] = [];
  RolEnum!: RolEnum;
  roles = Object.values(RolEnum);
  nameUser: string = '';
  user: string = '';

  ngOnInit() {
    this.getUsers();
    this.initForm();
  }

  private initForm() {
    this.userForm = this.formBuilder.group({
      first_name: ['', Validators.required],
      last_name: ['', Validators.required],
      username: ['', Validators.required],
      password: ['', [Validators.required, Validators.minLength(8)]],
      email: ['', [Validators.required, Validators.email]],
      roleControl: ['', Validators.required],
    });
  }

  getUsers() {
    this.userService.getUsers().subscribe((users) => {
      this.userList = users.map((user) => {
        let chipName: string = '';
        let chipColorName: string = '';
        let chipBackgroundColor: string = '';

        if (user.role === RolEnum.ADMIN) {
          chipName = 'administrador';
          chipColorName = 'var(--rojo)';
          chipBackgroundColor = 'var(--rojo-bg)';
        } else if (user.role === RolEnum.TESORERO) {
          chipName = 'tesorero';
          chipColorName = 'var(--azul)';
          chipBackgroundColor = 'var(--azul-bg)';
        } else {
          chipName = 'asociado';
          chipColorName = 'var(--verde-selva)';
          chipBackgroundColor = 'var(--verde-bg)';
        }

        return {
          ...user,
          chipName,
          chipColorName,
          chipBackgroundColor,
        };
      });

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
