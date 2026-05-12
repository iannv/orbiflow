import { CommonModule } from '@angular/common';
import { Component, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';

import { AuthService } from '../../core/auth/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class Login {
  readonly isSubmitting = signal(false);
  readonly errorMessage = signal('');

  readonly loginForm = new FormGroup({
    email: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.email],
    }),
    password: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required],
    }),
  });

  constructor(
    private readonly authService: AuthService,
    private readonly router: Router,
  ) {}

  submit(): void {
    this.errorMessage.set('');

    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }

    const { email, password } = this.loginForm.getRawValue();
    this.isSubmitting.set(true);

    this.authService.login(email, password).subscribe({
      next: (response) => {
        this.isSubmitting.set(false);
        void this.router.navigate([this.authService.getRedirectPath(response.user.role)]);
      },
      error: (error) => {
        this.isSubmitting.set(false);
        this.errorMessage.set(this.getErrorMessage(error.status));
      },
    });
  }

  hasFieldError(fieldName: 'email' | 'password'): boolean {
    const field = this.loginForm.controls[fieldName];
    return field.invalid && (field.dirty || field.touched);
  }

  private getErrorMessage(status: number): string {
    if (status === 403) {
      return 'La cuenta está deshabilitada.';
    }

    if (status === 401) {
      return 'Email o contraseña incorrectos.';
    }

    return 'No se pudo iniciar sesión. Intentá nuevamente.';
  }
}
