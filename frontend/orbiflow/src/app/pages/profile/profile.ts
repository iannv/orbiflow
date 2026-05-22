import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BaseCard } from '../../components/base-card/base-card';

import { AuthService } from '../../core/auth/auth.service';
import { AssociateService } from '../../services/associate-service';
import { Associate } from '../../interfaces/Associate';
import { Loader } from '../../components/loader/loader';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, BaseCard, Loader],
  templateUrl: './profile.html',
  styleUrl: './profile.css',
})
export class Profile implements OnInit {
  associate: Associate | null = null;
  error: string | null = null;
  loading: boolean = true;
  modules= [
    { title: 'Horas trabajadas', subtitle: 'Registro mensual de horas', quantity: '120 hs/mes' },
    { title: 'Presentismo', subtitle: 'Bono por asistencia', quantity: '$100.000' },
    { title: 'Antigüedad', subtitle: 'Adicional por años de servicio', quantity: '+ 5 % adicional' },
    
  ];

  constructor(
    private readonly authService: AuthService,
    private readonly associateService: AssociateService,
    private readonly cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.loading = true;
    this.error = null;
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
        this.loading = false;
        this.cdr.detectChanges();

      },
      error: () => {
        this.error = 'No se pudo cargar la información del perfil.';
        this.loading = false;
        this.cdr.detectChanges();

      },
    });
  }

  private logAssociates(): void {
    this.associateService.getAssociates().subscribe({
      next: (associates) => {
        console.log('Associates endpoint response:', associates);
        this.loading = false;
        this.cdr.detectChanges();

      },
      error: (error) => {
        console.error('Error fetching associates list:', error);
        this.loading = false;
        this.cdr.detectChanges();
      },
    });
  }
}
