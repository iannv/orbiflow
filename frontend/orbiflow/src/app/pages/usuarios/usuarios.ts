import { Component, OnInit, DoCheck, ChangeDetectorRef } from '@angular/core';
import { BaseCard } from '../../components/base-card/base-card';
import { Chip } from '../../components/chip/chip';
import { Action } from '../../components/button/action/action';
import { User } from '../../interfaces/User';
import { UserService } from '../../services/user-service';
import { Primary } from '../../components/button/primary/primary';
import { Router } from '@angular/router';
import { Modal } from '../../components/modal/modal';
import { Select } from '../../components/select/select';
import { RolEnum } from '../../enums/rolEnum';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
  AbstractControl,
  ValidationErrors,
  ValidatorFn,
} from '@angular/forms';
import { validate } from '@angular/forms/signals';

@Component({
  selector: 'app-usuarios',
  imports: [ReactiveFormsModule, BaseCard, Chip, Action, Primary, Modal, Select],
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
  RolEnum = RolEnum;
  nameUser: string = '';
  user: string = '';

  roles = [
    { value: RolEnum.ADMIN, label: 'Administrador' },
    { value: RolEnum.TREASURER, label: 'Tesorero' },
    { value: RolEnum.ASSOCIATE, label: 'Asociado' },
  ];

  ngOnInit() {
    // this.roles = Object.values(RolEnum);
    this.initForm();
  }

  ngAfterViewInit() {
    this.getUsers();
  }

  passwordMatchValidator: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
    const password = control.get('password')?.value;
    const repeatPassword = control.get('repeatPassword')?.value;
    if (!password || !repeatPassword) return null;
    return password === repeatPassword ? null : { passwordMismatch: true };
  };

  private initForm() {
    this.userForm = this.formBuilder.group(
      {
        first_name: ['', Validators.required],
        last_name: ['', Validators.required],
        username: ['', Validators.required],
        password: ['', [Validators.required, Validators.minLength(8), Validators.pattern(/^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{8,}$/)]],
        repeatPassword: ['', [Validators.required, Validators.minLength(8)]],
        email: ['', [Validators.required, Validators.email]],
        roleControl: ['', Validators.required],
        is_staff: [false],
        is_active: [true],
        is_superuser: [false],
        date_joined: [''],
      },
      {
        validators: this.passwordMatchValidator,
      },
    );
  }

  // Obtener todos los usuarios
  chipName?: string;
  chipColorName?: string;
  chipBackgroundColor?: string;
  getUsers() {
    this.userService.getUsers().subscribe((users) => {
      this.userList = users.map((user) => {
        if (user.role === RolEnum.ADMIN) {
          this.chipName = 'administrador';
          this.chipColorName = 'var(--rojo)';
          this.chipBackgroundColor = 'var(--rojo-bg)';
        } else if (user.role === RolEnum.TREASURER) {
          this.chipName = 'tesorero';
          this.chipColorName = 'var(--azul)';
          this.chipBackgroundColor = 'var(--azul-bg)';
        } else {
          this.chipName = 'asociado';
          this.chipColorName = 'var(--verde-selva)';
          this.chipBackgroundColor = 'var(--verde-bg)';
        }
        return {
          ...user,
          chipName: this.chipName,
          chipColorName: this.chipColorName,
          chipBackgroundColor: this.chipBackgroundColor,
        };
      });
      this.cdr.detectChanges();
    });
  }

  // Crear nuevo usuario
  createUser() {
    if (this.userForm.invalid) {
      this.userForm.markAllAsTouched();
      return;
    }

    const formValue = this.userForm.value;
    const newUser = {
      first_name: formValue.first_name,
      last_name: formValue.last_name,
      username: formValue.username,
      password: formValue.password,
      email: formValue.email,
      role: formValue.roleControl,
      is_staff: formValue.is_staff,
      is_active: formValue.is_active,
      is_superuser: formValue.is_superuser,
      date_joined: new Date().toISOString().split('T')[0],
    };
    this.userService.createUser(newUser).subscribe({
      next: () => {
        this.lanzarToast('Usuario creado', 'El usuario ha sido creado exitosamente');
        this.closeModal();
        this.getUsers();
        // this.userForm.reset({
        //   is_staff: false,
        //   is_active: true,
        //   is_superuser: false,
        // });
      },
      error: (err) => {
        console.error(err);
      },
    });
    this.getUsers();
  }

  // Modal
  isModalOpen = false;
  openModal() {
    this.isModalOpen = true;
  }
  closeModal() {
    this.isModalOpen = false;
    this.userForm.reset({
      is_staff: false,
      is_active: true,
      is_superuser: false,
      first_name: '',
      last_name: '',
      username: '',
      password: '',
      repeatPassword: '',
      email: '',
      roleControl: '',
    });
  }

  // Toast
  mostrarToast = false;
  toastTitle = '';
  toastSubtitle = '';
  lanzarToast(titulo: string, subtitulo: string): void {
    this.toastTitle = titulo;
    this.toastSubtitle = subtitulo;
    this.mostrarToast = true;
    this.cdr.detectChanges();

    // Ocultar automáticamente
    setTimeout(() => {
      this.mostrarToast = false;
      this.cdr.detectChanges();
    }, 3500);
  }
}
