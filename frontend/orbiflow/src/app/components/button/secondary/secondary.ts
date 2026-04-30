import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-secondary',
  imports: [],
  templateUrl: './secondary.html',
  styleUrl: './secondary.css',
})
export class Secondary {
  @Input() name: string = '';
}
