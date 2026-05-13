import { Component, signal } from '@angular/core';

import { Modal } from '../../components/modal/modal';

@Component({
  selector: 'app-modal-showcase',
  standalone: true,
  imports: [Modal],
  templateUrl: './modal-showcase.html',
  styleUrl: './modal-showcase.css',
})
export class ModalShowcase {

  showNewUserModal = signal(false);
  showEditUserModal = signal(false);
  showDeleteUserModal = signal(false);

  showNewModuleModal = signal(false);
  showEditModuleModal = signal(false);

  showNewAssociateModal = signal(false);
  showEditAssociateModal = signal(false);

  showAssociateModulesModal = signal(false);

  openModal(modal: any): void {
    modal.set(true);
  }

  closeModal(modal: any): void {
    modal.set(false);
  }

}