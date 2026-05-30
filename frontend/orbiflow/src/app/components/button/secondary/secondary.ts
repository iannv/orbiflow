import { Component, EventEmitter, Input, Output } from '@angular/core';
import { NgStyle } from '@angular/common';

@Component({
  selector: 'app-secondary',
  imports: [NgStyle],
  templateUrl: './secondary.html',
  styleUrl: './secondary.css',
})
export class Secondary {
  @Input() name: string = '';
  @Input() newColor: string = '';
  @Input() btnImg: string = '';

  @Output() btnClick = new EventEmitter();

  click() {
    this.btnClick.emit();
  }
}
