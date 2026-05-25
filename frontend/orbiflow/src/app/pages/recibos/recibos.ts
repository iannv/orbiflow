import { ChangeDetectorRef, Component, ViewChild } from '@angular/core';
import { BaseCard } from '../../components/base-card/base-card';
import { Primary } from '../../components/button/primary/primary';
import { RetirementService } from '../../services/retirement-service';
import { Retirement } from '../../interfaces/Retirement';
import { AuthService } from '../../core/auth/auth.service';
import { AssociateService } from '../../services/associate-service';

@Component({
  selector: 'app-recibos',
  imports: [BaseCard, Primary],
  templateUrl: './recibos.html',
  styleUrl: './recibos.css',
})
export class Recibos {
  arrow: string = 'assets/flecha-derecha.png';
  year: string = '';
  amount: number = 0;

  retirementsList: Retirement[] = [];

  @ViewChild('collapseElement') collapseElement: any;

  constructor(
    private cdr: ChangeDetectorRef,
    private retirementService: RetirementService,
    private authService: AuthService,
    private associateService: AssociateService
  ) {}

  ngOnInit() {
    this.getRetirements();
  }

  ngAfterViewInit() {
    this.isCollapse();
  }

  // Colapsar card
  isCollapse() {
    const element = this.collapseElement.nativeElement;
    element.addEventListener('shown.bs.collapse', () => {
      this.arrow = 'assets/flecha-abajo.png';
      this.cdr.detectChanges();
    });
    element.addEventListener('hidden.bs.collapse', () => {
      this.arrow = 'assets/flecha-derecha.png';
      this.cdr.detectChanges();
    });
  }

  // Obtener recibos de un asociado
  getRetirements() {
    const user = this.authService.currentUser();
    if (!user) return;

    this.associateService.getAssociateByUser(user.id).subscribe((associate) => {
      if (associate.length === 0) return;

      const associateId = associate[0].id;

      this.retirementService.getRetirementsByAssociate(associateId).subscribe((retirements) => {
        this.retirementsList = retirements;
        this.cdr.detectChanges();
        console.log('RECIBOS ', retirements)
      })
    })
  }
}
