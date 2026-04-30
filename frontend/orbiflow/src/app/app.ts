import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Primary } from "./components/button/primary/primary";
import { Secondary } from "./components/button/secondary/secondary";

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, Secondary, Primary],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  protected readonly title = signal('orbiflow');
}
