import { Component, signal } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';
import { NgClass } from '@angular/common';

import { AuthService } from './core/auth/auth.service';

import { Header } from './shared/header/header';
import { Sidenav2 } from './shared/sidenav2/sidenav2';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, Header, Sidenav2, NgClass],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  protected readonly title = signal('orbiflow');

  sidebarExpanded = true;

  constructor(
    private readonly router: Router,
    private readonly authService: AuthService,
  ) {}

  showShell(): boolean {
    return (
      this.authService.isAuthenticated() &&
      !this.router.url.startsWith('/login')
    );
  }
}
