import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { Secondary } from "../../components/button/secondary/secondary";
import { AuthService } from '../../core/auth/auth.service';
import { UserRole } from '../../core/auth/auth.models';

@Component({
  selector: 'app-header',
  imports: [Secondary],
  templateUrl: './header.html',
  styleUrl: './header.css',
})
export class Header {
  btnImg: string = 'assets/logout.png';

  constructor(
    private readonly authService: AuthService,
    private readonly router: Router,
  ) {}

  get roleLabel(): string {
    const role = this.authService.currentUser()?.role;

    const labels: Record<UserRole, string> = {
      admin: 'Administrador',
      treasurer: 'Tesorero',
      associate: 'Asociado',
    };

    return role ? labels[role] : 'Usuario';
  }

  logout(): void {
    this.authService.logout();
    void this.router.navigate(['/login']);
  }
}
