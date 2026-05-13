import { Component, signal } from '@angular/core';

import { Modal } from '../../components/modal/modal';

import { input } from '../../components/input/input';
import { Select } from '../../components/select/select';
import { Textarea } from '../../components/textarea/textarea';
import { Switch } from '../../components/button/switch/switch';

@Component({
  selector: 'app-modal-showcase',
  standalone: true,
 imports: [
  Modal,
  input,
  Select,
  Textarea,
  Switch,
],
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