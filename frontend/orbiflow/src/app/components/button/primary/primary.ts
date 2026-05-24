import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-primary',
  imports: [],
  templateUrl: './primary.html',
  styleUrl: './primary.css',
})
export class Primary {
  @Input() name: string = '';
  @Input() btnImg: string = '';
  @Input() height: string = '';
  @Input() padding: string = '';
  @Output() btnClick = new EventEmitter();

  click() {
    this.btnClick.emit();
  }
}
