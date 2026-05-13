import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Header } from "./shared/header/header";
import { NgClass } from "@angular/common";
import { Sidenav } from './shared/sidenav/sidenav';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, Header, NgClass, Sidenav],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  protected readonly title = signal('orbiflow');
  sidebarExpanded = true;

}
