import { Component, OnInit, signal } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';
import { NgClass } from '@angular/common';

import { AuthService } from './core/auth/auth.service';

import { Header } from './shared/header/header';
import { Sidenav } from './shared/sidenav/sidenav';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, Header, Sidenav, NgClass],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App implements OnInit {
  protected readonly title = signal('orbiflow');

  sidebarExpanded = true;

  constructor(
    private readonly router: Router,
    private readonly authService: AuthService,
  ) {}

  ngOnInit(): void {
    // Si hay token guardado, verificar que sea válido con el backend
    if (this.authService.isAuthenticated()) {
      this.authService.loadCurrentUser().subscribe({
        error: () => {
          // Token inválido o expirado, redirigir a login
          this.authService.logout();
          this.router.navigate(['/login']);
        },
      });
    }
  }

  showShell(): boolean {
    return (
      this.authService.isAuthenticated() &&
      !this.router.url.startsWith('/login') &&
      !this.router.url.startsWith('/modal-showcase')
    );
  }
}
