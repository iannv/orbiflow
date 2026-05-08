import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Header } from "./shared/header/header";
import { Sidenav2 } from "./shared/sidenav2/sidenav2";
import { NgClass } from "@angular/common";
import { Chip } from './components/chip/chip';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, Header, Sidenav2, NgClass, Chip],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  protected readonly title = signal('orbiflow');
  sidebarExpanded = true;

}
