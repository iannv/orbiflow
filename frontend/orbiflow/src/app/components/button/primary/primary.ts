import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-primary',
  imports: [],
  templateUrl: './primary.html',
  styleUrl: './primary.css',
})
export class Primary {
  @Input() name: string = '';
  @Input() btnImg: string = '';
}
