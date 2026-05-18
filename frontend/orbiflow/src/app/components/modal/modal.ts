import { CommonModule, NgClass } from '@angular/common';
import { Component, EventEmitter, Input, Output, ViewEncapsulation } from '@angular/core';

@Component({
  selector: 'app-modal',
  standalone: true,
  imports: [CommonModule, NgClass],
  templateUrl: './modal.html',
  styleUrl: './modal.css',
  encapsulation: ViewEncapsulation.None,
})
export class Modal {
  private static nextId = 0;

  readonly titleId = `app-modal-title-${Modal.nextId++}`;
  readonly subtitleId = `app-modal-subtitle-${Modal.nextId++}`;

  @Input() isOpen = false;
  @Input() title = '';
  @Input() subtitle = '';

  @Input() primaryBtnText = 'Guardar';
  @Input() secondaryBtnText = 'Cancelar';
  @Input() primaryBtnColor: 'green' | 'red' | 'blue' = 'green';
  @Input() primaryBtnPosition: 'left' | 'right' | 'center' | 'full' = 'right';
  @Input() size: 'sm' | 'md' | 'lg' = 'md';
  @Input() showFooter = true;
  @Input() closeOnBackdrop = true;
  @Input() isPrimaryDisabled = false;
  @Input() hideSecondaryBtn = false;

  @Output() primaryBtnClick = new EventEmitter<void>();
  @Output() secondaryBtnClick = new EventEmitter<void>();
  @Output() close = new EventEmitter<void>();

  onBackdropClick(): void {
    if (this.closeOnBackdrop) {
      this.onClose();
    }
  }

  onPrimaryClick(): void {
    this.primaryBtnClick.emit();
  }

  onSecondaryClick(): void {
    this.secondaryBtnClick.emit();
  }

  onClose(): void {
    this.close.emit();
  }
}
