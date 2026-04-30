import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Action } from "./components/button/action/action";

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  protected readonly title = signal('orbiflow');

}
