import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { input } from './components/input/input';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, input],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  protected readonly title = signal('orbiflow');
  type: string = 'text';
  placeholder: string = 'g';
}
