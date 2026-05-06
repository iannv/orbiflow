import { Component } from '@angular/core';
import { Secondary } from "../../components/button/secondary/secondary";

@Component({
  selector: 'app-header',
  imports: [Secondary],
  templateUrl: './header.html',
  styleUrl: './header.css',
})
export class Header {
  btnImg: string = 'assets/logout.png';
}
