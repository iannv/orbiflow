import { Component, EventEmitter, Input, Output } from '@angular/core';
import { NgStyle, NgClass } from "@angular/common";

@Component({
  selector: 'app-chip',
  imports: [NgStyle, NgClass],
  templateUrl: './chip.html',
  styleUrl: './chip.css',
})
export class Chip {
  @Input() name: string = '';
  @Input() backgroundColor: string = '';
  @Input() colorName: string = '';
  @Input() badgeActive: boolean = false;

  @Output() click = new EventEmitter();

  onclick(){
    this.click.emit();
  }
}
