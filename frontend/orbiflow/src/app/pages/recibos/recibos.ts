import { ChangeDetectorRef, Component, ViewChild } from '@angular/core';
import { BaseCard } from '../../components/base-card/base-card';
import { Primary } from '../../components/button/primary/primary';

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

  @ViewChild('collapseElement') collapseElement: any;

  constructor(private cdr: ChangeDetectorRef) {}

  ngOnInit() {}

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


  // Obtener recibos por año
  // getRetirements(){}

}
