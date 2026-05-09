import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-base-card',
  imports: [],
  templateUrl: './base-card.html',
  styleUrl: './base-card.css',
})
export class BaseCard {
  @Input() title: string = '';
  @Input() subtitle: string = '';
}
