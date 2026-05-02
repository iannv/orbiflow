import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Action } from "./components/button/action/action";
import { Switch } from "./components/button/switch/switch";

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  protected readonly title = signal('orbiflow');

}
