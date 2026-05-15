import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BaseCard } from '../../components/base-card/base-card';

import { AuthService } from '../../core/auth/auth.service';
import { AssociateService } from '../../services/associate-service';
import { Associate } from '../../interfaces/Associate';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, BaseCard],
  templateUrl: './profile.html',
  styleUrl: './profile.css',
})
export class Profile implements OnInit {
  associate: Associate | null = null;
  error = '';

  constructor(
    private readonly authService: AuthService,
    private readonly associateService: AssociateService,
  ) {}

  ngOnInit() {
    const user = this.authService.currentUser();

    if (!user) {
      this.error = 'No se encontró el usuario autenticado.';
      return;
    }

    this.logAssociates();

    this.associateService.getAssociateByUser(user.id).subscribe({
      next: (associates) => {
        if (associates && associates.length > 0) {
          this.associate = associates[0];
        } else {
          this.error = 'No se encontró el asociado para este usuario.';
        }
      },
      error: () => {
        this.error = 'No se pudo cargar la información del perfil.';
      },
    });
  }

  private logAssociates(): void {
    this.associateService.getAssociates().subscribe({
      next: (associates) => {
        console.log('Associates endpoint response:', associates);
      },
      error: (error) => {
        console.error('Error fetching associates list:', error);
      },
    });
  }
}
