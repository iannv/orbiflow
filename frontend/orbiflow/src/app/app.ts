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
    // Verificar token al iniciar: si es inválido (401) o hay error de red (0), redirigir a login
    if (this.authService.isAuthenticated()) {
      this.authService.loadCurrentUser().subscribe({
        error: (err) => {
          if (err.status === 401 || err.status === 0) {
            this.authService.logout();
            this.router.navigate(['/login']);
          }
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
