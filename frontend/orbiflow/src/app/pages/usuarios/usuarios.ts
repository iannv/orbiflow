import { Component, OnInit, DoCheck, ChangeDetectorRef } from '@angular/core';
import { BaseCard } from '../../components/base-card/base-card';
import { Chip } from '../../components/chip/chip';
import { Action } from '../../components/button/action/action';
import { User } from '../../interfaces/User';
import { UserService } from '../../services/user-service';
import { Primary } from '../../components/button/primary/primary';
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
import { Toast } from '../../components/toast/toast';

@Component({
  selector: 'app-usuarios',
  imports: [ReactiveFormsModule, BaseCard, Chip, Action, Primary, Modal, Select, Toast],
  templateUrl: './usuarios.html',
  styleUrl: './usuarios.css',
})
export class Usuarios implements OnInit {
  constructor(
    private userService: UserService,
    private formBuilder: FormBuilder,
    private cdr: ChangeDetectorRef,
  ) {}

  modalMode: 'create' | 'edit' | 'delete' = 'create';
  userForm!: FormGroup;
  userList: User[] = [];
  RolEnum = RolEnum;
  nameUser: string = '';
  user: string = '';
  selectedUser: User | null = null;

  roles = [
    { value: RolEnum.ADMIN, label: 'Administrador' },
    { value: RolEnum.TREASURER, label: 'Tesorero' },
    { value: RolEnum.ASSOCIATE, label: 'Asociado' },
  ];

  ngOnInit() {
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
        password: [''],
        repeatPassword: [''],
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
      },
      error: (err) => {
        console.error(err);
      },
    });
    this.getUsers();
  }

  // Actualizar usuario
  updateUser(user: User) {
    if (this.userForm.invalid) {
      this.userForm.markAllAsTouched();
      return;
    }
    if (!user.id) return;
    if (!this.selectedUser?.id) return;
    const formValue = this.userForm.value;
    const updateData: Partial<User> = {
      first_name: formValue.first_name,
      last_name: formValue.last_name,
      username: formValue.username,
      email: formValue.email,
      role: formValue.roleControl,
      is_staff: formValue.is_staff,
      is_active: formValue.is_active,
      is_superuser: formValue.is_superuser,
    };
    if (formValue.password) {
      updateData.password = formValue.password;
    }
    this.userService.updateUser(this.selectedUser.id, updateData).subscribe(() => {
      this.lanzarToast('Usuario actualizado', 'Los cambios se guardaron correctamente');
      this.closeModal();
      this.getUsers();
    });
  }

  // Eliminar usuario
  deleteUser(user: User) {
    if (!user.id) return;
    this.userService.deleteUser(user.id).subscribe(() => {
      this.lanzarToast(
        'Usuario eliminado',
        `El usuario ${user.username} ha sido eliminado exitosamente`,
      );
      this.closeModal();
      this.getUsers();
    });
  }

  // Modal
  isModalOpen = false;
  modalTtle: string = '';
  modalSubtitle: string = '';
  optionalPassword: string = '';
  primaryBtnText: string = '';
  // Abrir modal para crear nuevo usuario
  openModal() {
    this.modalMode = 'create';
    this.isModalOpen = true;
    this.modalTtle = 'Nuevo Usuario';
    this.modalSubtitle = 'Ingrese los datos para el nuevo usuario';
    this.primaryBtnText = 'Crear usuario';
    if (this.modalMode === 'create') {
      this.userForm
        .get('password')
        ?.setValidators([
          Validators.required,
          Validators.minLength(8),
          Validators.pattern(/^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{8,}$/),
        ]);
      this.userForm
        .get('repeatPassword')
        ?.setValidators([Validators.required, Validators.minLength(8)]);

      this.userForm.get('password')?.updateValueAndValidity();
      this.userForm.get('repeatPassword')?.updateValueAndValidity();
    }
  }

  // Abrir modal de edición para actualizar datos del usuario
  openEditModal(user: User): void {
    this.modalTtle = 'Editar Usuario';
    this.modalSubtitle = 'Actualice los datos del usuario';
    this.modalMode = 'edit';
    this.selectedUser = user;
    this.isModalOpen = true;
    this.optionalPassword = '(Opcional)';
    this.primaryBtnText = 'Guardar cambios';

    this.userForm.patchValue({
      first_name: user.first_name,
      last_name: user.last_name,
      username: user.username,
      email: user.email,
      roleControl: user.role,
      is_staff: user.is_staff,
      is_active: user.is_active,
      is_superuser: user.is_superuser,
      password: '',
      repeatPassword: '',
    });
    this.userForm.get('password')?.clearValidators();
    this.userForm.get('repeatPassword')?.clearValidators();

    this.userForm.get('password')?.updateValueAndValidity();
    this.userForm.get('repeatPassword')?.updateValueAndValidity();
  }
  // Eliminar usuario con confirmación
  openDeleteModal(user: User) {
    this.modalMode = 'delete';
    this.selectedUser = user;
    this.modalTtle = 'Confirmar Eliminación';
    this.modalSubtitle = `¿Está seguro de que desea eliminar al usuario ${user.username}? Esta acción no se puede deshacer.`;
    this.primaryBtnText = 'Eliminar';
    this.isModalOpen = true;
  }
  // Enviar formulario para crear o actualizar usuario según el modo
  modalSubmit() {
    if (this.modalMode === 'create') {
      this.createUser();
    } else if (this.modalMode === 'edit' && this.selectedUser) {
      this.updateUser(this.selectedUser);
    } else if (this.modalMode === 'delete' && this.selectedUser) {
      this.deleteUser(this.selectedUser);
    }
  }

  // Cerrar modal y resetear formulario
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

  // Paginator
  currentPage = 1;
  itemsPerPage = 5;
  get totalPages(): number {
    return Math.ceil(this.userList.length / this.itemsPerPage);
  }
  get paginatedUsers(): User[] {
    const start = (this.currentPage - 1) * this.itemsPerPage;
    const end = start + this.itemsPerPage;
    return this.userList.slice(start, end);
  }
  changePage(page: number) {
    if (page < 1 || page > this.totalPages) return;
    this.currentPage = page;
  }
}
