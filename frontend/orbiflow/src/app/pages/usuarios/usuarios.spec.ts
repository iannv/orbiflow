import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { vi } from 'vitest';
import { of } from 'rxjs';
import { Usuarios } from './usuarios';
import { RolEnum } from '../../enums/rolEnum';
import { UserService } from '../../services/user-service';
import { User } from '../../interfaces/User';

describe('Usuarios', () => {
  let component: Usuarios;
  let fixture: ComponentFixture<Usuarios>;
  let userService: UserService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Usuarios],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(Usuarios);
    component = fixture.componentInstance;
    await fixture.whenStable();
    userService = TestBed.inject(UserService);
    component.ngOnInit();
    // fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // createUser - Alta de nuevo usuario
  describe('createUser', () => {
    // Validar formulario
    it('no debe crear un usuario si el formulario es inválido', () => {
      vi.spyOn(component.userForm, 'markAllAsTouched');
      component.createUser();
      expect(component.userForm.markAllAsTouched).toHaveBeenCalled();
    });

    // Crear usuario
    it('debe llamar al servicio para crear el usuario', () => {
      vi.spyOn(userService, 'createUser').mockReturnValue(of({} as User));
      component.userForm.patchValue({
        first_name: 'Juan',
        last_name: 'Perez',
        username: 'jperez',
        password: 'abcd1234',
        email: 'juan@test.com',
        roleControl: RolEnum.ADMIN,
        is_coop_member: true,
        is_active: true,
        date_joined: new Date().toISOString().split('T')[0],
      });
      component.createUser();
      expect(userService.createUser).toHaveBeenCalled();
    });

    // Enviar los datos correctamente al servidor
    it('debe enviar los datos correctos al servicio', () => {
      const createUserSpy = vi.spyOn(userService, 'createUser').mockReturnValue(of({} as User));
      component.userForm.patchValue({
        first_name: 'Juan',
        last_name: 'Perez',
        username: 'jperez',
        password: 'abcd1234',
        email: 'juan@test.com',
        roleControl: RolEnum.ADMIN,
        is_coop_member: true,
        is_active: true,
        date_joined: new Date().toISOString().split('T')[0],
      });
      component.createUser();
      expect(createUserSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          first_name: 'Juan',
          last_name: 'Perez',
          username: 'jperez',
          password: 'abcd1234',
          email: 'juan@test.com',
          role: RolEnum.ADMIN,
          is_coop_member: true,
          is_active: true,
          date_joined: new Date().toISOString().split('T')[0],
        }),
      );
    });

    // InitForm - Validar los campos del formulario
    describe('initForm', () => {
      it('debe ser inválido si hay algún campo vacío', () => {
        const name = component.userForm.get('first_name');
        const last_name = component.userForm.get('last_name');
        const username = component.userForm.get('username');
        const password = component.userForm.get('password');
        const email = component.userForm.get('email');
        const role = component.userForm.get('roleControl');

        name?.setValue('');
        last_name?.setValue('');
        username?.setValue('');
        password?.setValue('');
        email?.setValue('');
        role?.setValue('');

        expect(name?.valid).toBeFalsy();
        expect(last_name?.valid).toBeFalsy();
        expect(username?.valid).toBeFalsy();
        expect(password?.valid).toBeFalsy();
        expect(email?.valid).toBeFalsy();
        expect(role?.valid).toBeFalsy();

        expect(name?.hasError('required')).toBeTruthy();
        expect(last_name?.hasError('required')).toBeTruthy();
        expect(username?.hasError('required')).toBeTruthy();
        expect(password?.hasError('required')).toBeTruthy();
        expect(email?.hasError('required')).toBeTruthy();
        expect(role?.hasError('required')).toBeTruthy();
      });

      // Validar email
      it('debe marcar error cuando el email tiene formato inválido', () => {
        const email = component.userForm.get('email');
        email?.setValue('error_mail.email');
        expect(email?.valid).toBeFalsy();
        expect(email?.hasError('email')).toBeTruthy();
      });

      it('debe aceptar un email válido', () => {
        const email = component.userForm.get('email');
        email?.setValue('emailcorrecto@email.com');
        expect(email?.valid).toBeTruthy();
      });

      // Validar contraseña
      it('debe validar que la contraseña contenga al menos 8 caracteres', () => {
        const password = component.userForm.get('password');
        password?.setValue('abc123');
        expect(password?.valid).toBeFalsy();
        expect(password?.hasError('minlength')).toBeTruthy();
      });

      it('debe ser inválida si no contiene números', () => {
        const password = component.userForm.get('password');
        password?.setValue('abcacbacb');
        expect(password?.valid).toBeFalsy();
        expect(password?.hasError('pattern')).toBeTruthy();
      });

      it('debe ser inválida si no contiene letras', () => {
        const password = component.userForm.get('password');
        password?.setValue('4569851215');
        expect(password?.valid).toBeFalsy();
        expect(password?.hasError('pattern')).toBeTruthy();
      });
    });
  });

  // passwordMatchValidator - Validar si coinciden las contraseñas
  describe('passwordMatchValidator', () => {
    it('debe devolver null cuando las contraseñas coinciden', () => {
      component.userForm.patchValue({
        password: 'abcd1234',
        repeatPassword: 'abcd1234',
      });
      expect(component.passwordMatchValidator(component.userForm)).toBeNull();
    });

    it('debe devolver passwordMismatch cuando las contraseñas no coinciden', () => {
      component.userForm.patchValue({
        password: 'abcd1234',
        repeatPassword: 'dhjr7895',
      });
      expect(component.passwordMatchValidator(component.userForm)).toEqual({
        passwordMismatch: true,
      });
    });
  });

  // resolveIsCoopMember - Validar si es miembro o no de la cooperativa
  describe('resolveIsCoopMember', () => {
    it('debe devolver true para asociados', () => {
      const result = (component as any).resolveIsCoopMember(RolEnum.ASSOCIATE, false);
      expect(result).toBeTruthy();
    });

    it('debe devolver true para tesoreros', () => {
      const result = (component as any).resolveIsCoopMember(RolEnum.TREASURER, false);
      expect(result).toBeTruthy();
    });

    it('debe devolver true para administradores cuando el valor recibido es true', () => {
      const result = (component as any).resolveIsCoopMember(RolEnum.ADMIN, true);
      expect(result).toBeTruthy();
    });

    it('debe devolver false para administradores cuando el valor recibido es false', () => {
      const result = (component as any).resolveIsCoopMember(RolEnum.ADMIN, false);
      expect(result).toBeFalsy();
    });
  });

  // validateIsCoopMember - Verificar membresía obligatoria para asociados y tesoreros
  describe('validateIsCoopMember', () => {
    it('debe tildar automáticamente el checkbox si es asociado', () => {
      component.userForm.patchValue({
        roleControl: RolEnum.ASSOCIATE,
        is_coop_member: false,
      });
      component.validateIsCoopMember();
      expect(component.userForm.get('is_coop_member')?.value).toBeTruthy();
    });

    it('debe tildar automáticamente el checkbox si es tesorero', () => {
      component.userForm.patchValue({
        roleControl: RolEnum.TREASURER,
        is_coop_member: false,
      });
      component.validateIsCoopMember();
      expect(component.userForm.get('is_coop_member')?.value).toBeTruthy();
    });

    it('debe mantener true para admins cuando el checkbox está marcado', () => {
      component.userForm.patchValue({
        roleControl: RolEnum.ADMIN,
        is_coop_member: true,
      });
      component.validateIsCoopMember();
      expect(component.userForm.get('is_coop_member')?.value).toBeTruthy();
    });

    it('debe mantener false para admins cuando el checkbox no está marcado', () => {
      component.userForm.patchValue({
        roleControl: RolEnum.ADMIN,
        is_coop_member: false,
      });
      component.validateIsCoopMember();
      expect(component.userForm.get('is_coop_member')?.value).toBeFalsy();
    });
  });

  // needsLegajoWarning - Controlar si se debe dar de alta el legajo
  describe('needsLegajoWarning', () => {
    it('debe validar si necesita legajo el asociado', () => {
      component.userForm.patchValue({
        roleControl: RolEnum.ASSOCIATE,
      });
      expect(component.needsLegajoWarning).toBeTruthy();
    });

    it('debe validar si necesita legajo el tesorero', () => {
      component.userForm.patchValue({
        roleControl: RolEnum.TREASURER,
      });
      expect(component.needsLegajoWarning).toBeTruthy();
    });

    it('debe validar si necesita legajo el admin', () => {
      component.userForm.patchValue({
        roleControl: RolEnum.ADMIN,
      });
      expect(component.needsLegajoWarning).toBeFalsy();
    });
  });

  // updateUser - Editar usuario existente
  describe('updateUser', () => {
    it('debe llamar al servicio para actualizar el usuario', () => {
      const updateSpy = vi.spyOn(userService, 'updateUser').mockReturnValue(of({} as User));
      const user: User = {
        id: 1,
        first_name: 'Juan',
        last_name: 'Perez',
        username: 'jperez',
        password: 'abcd1234789',
        email: 'juan@test.com',
        role: RolEnum.ASSOCIATE,
        is_coop_member: true,
        is_active: true,
        date_joined: '2026-06-06',
      };

      component.selectedUser = user;

      component.userForm.patchValue({
        first_name: 'Juan',
        last_name: 'Perez',
        username: 'jperez',
        password: 'abcd1234',
        repeatPassword: 'abcd1234',
        email: 'juan@test.com',
        roleControl: RolEnum.ASSOCIATE,
        is_coop_member: true,
        is_active: true,
      });
      component.updateUser(user);
      expect(updateSpy).toHaveBeenCalled();
    });
  });

  // deleteUser - Eliminar usuario existente
  describe('deleteUser', () => {
    it('debe llamar al servicio para eliminar al usuario', () => {
      const deleteSpy = vi.spyOn(userService, 'deleteUser').mockReturnValue(of(void 0));

      const user: User = {
        id: 1,
        username: 'jperez',
      } as User;

      component.deleteUser(user);
      expect(deleteSpy).toHaveBeenCalled();
    });
  });

  // -----------------------------

  describe('applyFilters', () => {
    it('', () => {
      component.userList = [
        {
          first_name: 'Juan',
          last_name: 'Perez',
          role: RolEnum.ADMIN,
        } as User,
        {
          first_name: 'Maria',
          last_name: 'Gomez',
          role: RolEnum.ASSOCIATE,
        } as User,
      ];
      component.searchQuery = 'ju';
      component.applyFilters();
      expect(component.filteredList.length).toBe(1);
    });

    // Verificar si filtra por un rol específico
    it('debe filtrar por rol admin', () => {
      component.userList = [
        {
          first_name: 'Juan',
          role: RolEnum.ADMIN,
        } as User,
        {
          first_name: 'Maria',
          role: RolEnum.ASSOCIATE,
        } as User,
      ];
      component.selectedRole = RolEnum.ADMIN;
      component.applyFilters();
      expect(component.filteredList.length).toBe(1);
      expect(component.filteredList[0].role).toBe(RolEnum.ADMIN);
    });
  });
});
