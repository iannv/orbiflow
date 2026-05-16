import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-action',
  imports: [],
  templateUrl: './action.html',
  styleUrl: './action.css',
})
export class Action {
  @Input() btnImg: string = '';
  @Output() btnClick = new EventEmitter();

  click() {
    this.btnClick.emit();
  }
}
