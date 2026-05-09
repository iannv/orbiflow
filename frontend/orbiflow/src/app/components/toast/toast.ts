import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-toast',
  imports: [],
  templateUrl: './toast.html',
  styleUrl: './toast.css',
})
export class Toast {
  @Input() title: string = '';
  @Input() subtitle: string = '';

}
