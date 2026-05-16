import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { BaseCard } from '../../components/base-card/base-card';
import { Chip } from '../../components/chip/chip';
import { Modal } from '../../components/modal/modal';
import { Primary } from '../../components/button/primary/primary';
import { Secondary } from '../../components/button/secondary/secondary';
import { Action } from '../../components/button/action/action';
import { AssociateService, ModuleCatalog } from '../../services/associate-service';
import { UserService } from '../../services/user-service';
import { Associate, CreateAssociatePayload } from '../../interfaces/Associate';
import { User } from '../../interfaces/User';

@Component({
  selector: 'app-page-asociados',
  imports: [
    CommonModule,
    FormsModule,
    BaseCard,
    Chip,
    Modal,
    Primary,
    Secondary,
    Action,
  ],
  templateUrl: './page-asociados.html',
  styleUrls: ['../profile/profile.css', './page-asociados.css'],
})
export class PageAsociados implements OnInit {
  associateList: Associate[] = [];
  filteredList: Associate[] = [];

  loading = true;
  error: string | null = null;

  searchQuery = '';
  sortField: 'first_name' | 'last_name' = 'last_name';
  sortAsc = true;
  currentPage = 1;
  readonly pageSize = 5;

  showModal = false;
  showModulesModal = false;
  modalMode: 'create' | 'edit' = 'create';

  selectedAssociate: Associate | null = null;
  availableUsers: User[] = [];
  modulesCatalog: ModuleCatalog[] = [];

  formData: CreateAssociatePayload = this.emptyForm();

  constructor(
    private readonly associateService: AssociateService,
    private readonly userService: UserService,
    private readonly cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.loadAssociates();
  }

  loadAssociates(): void {
    this.loading = true;
    this.error = null;

    this.associateService.getAssociates().subscribe({
      next: (data) => {
        const id = this.selectedAssociate?.id;
        this.associateList = (Array.isArray(data) ? data : []).map((a) => ({
          ...a,
          variants: a.variants ?? [],
        }));
        if (id) {
          this.selectedAssociate = this.associateList.find((a) => a.id === id) ?? null;
        }
        this.applyFilters();
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.error = 'No se pudieron cargar los asociados.';
        this.loading = false;
        this.cdr.detectChanges();
      },
    });
  }

  applyFilters(): void {
    const q = this.searchQuery.trim().toLowerCase();
    let result = this.associateList.filter((a) => {
      if (!q) return true;
      return [a.full_name, a.first_name, a.last_name, a.dni].some((v) =>
        String(v ?? '').toLowerCase().includes(q),
      );
    });

    result.sort((a, b) => {
      const cmp = String(a[this.sortField] ?? '')
        .toLowerCase()
        .localeCompare(String(b[this.sortField] ?? '').toLowerCase(), 'es');
      return this.sortAsc ? cmp : -cmp;
    });

    this.filteredList = result;
    this.currentPage = 1;
    this.cdr.detectChanges();
  }

  clearSearch(): void {
    this.searchQuery = '';
    this.applyFilters();
  }

  setSort(field: 'first_name' | 'last_name'): void {
    if (this.sortField === field) this.sortAsc = !this.sortAsc;
    else {
      this.sortField = field;
      this.sortAsc = true;
    }
    this.applyFilters();
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.filteredList.length / this.pageSize));
  }

  get paginatedList(): Associate[] {
    const start = (this.currentPage - 1) * this.pageSize;
    return this.filteredList.slice(start, start + this.pageSize);
  }

  get pageNumbers(): number[] {
    return Array.from({ length: this.totalPages }, (_, i) => i + 1);
  }

  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages) this.currentPage = page;
  }

  openCreateModal(): void {
    this.modalMode = 'create';
    this.selectedAssociate = null;
    this.formData = this.emptyForm();
    this.userService.getUsers().subscribe({
      next: (users) => {
        const linked = new Set(this.associateList.map((a) => a.user));
        this.availableUsers = users.filter((u) => u.role === 'associate' && !linked.has(u.id));
        this.cdr.detectChanges();
      },
    });
    this.showModal = true;
  }

  openEditModal(associate: Associate): void {
    this.modalMode = 'edit';
    this.selectedAssociate = associate;
    this.formData = {
      user: associate.user,
      dni: associate.dni,
      cbu: associate.cbu,
      entry_date: associate.entry_date,
      base_hours: associate.base_hours,
      personal_email: associate.personal_email,
      phone_number: associate.phone_number,
      address: associate.address,
    };
    this.showModal = true;
  }

  closeModal(): void {
    this.showModal = false;
  }

  submitForm(): void {
    if (this.modalMode === 'create' && !this.formData.user) {
      this.error = 'Seleccioná un usuario.';
      return;
    }
    if (!/^\d{22}$/.test(this.formData.cbu.trim())) {
      this.error = 'El CBU debe tener 22 dígitos.';
      return;
    }

    const payload = {
      ...this.formData,
      cbu: this.formData.cbu.trim(),
      dni: this.formData.dni.trim(),
    };
    const req =
      this.modalMode === 'create'
        ? this.associateService.createAssociate(payload)
        : this.associateService.updateAssociate(this.selectedAssociate!.id, payload);

    req.subscribe({
      next: () => {
        this.closeModal();
        this.loadAssociates();
      },
      error: () => {
        this.error = 'No se pudo guardar el legajo.';
        this.cdr.detectChanges();
      },
    });
  }

  openModulesModal(associate: Associate): void {
    this.selectedAssociate = associate;
    this.showModulesModal = true;
    this.associateService.getModules().subscribe({
      next: (m) => {
        this.modulesCatalog = m.filter((x) => x.is_active);
        this.cdr.detectChanges();
      },
      error: () => {
        this.error = 'No se pudieron cargar los módulos.';
        this.cdr.detectChanges();
      },
    });
  }

  closeModulesModal(): void {
    this.showModulesModal = false;
  }

  isAssigned(variantId: number): boolean {
    return !!this.selectedAssociate?.variants?.some((v) => v.variant === variantId);
  }

  toggleVariant(variantId: number): void {
    const a = this.selectedAssociate;
    if (!a) return;

    const existing = a.variants?.find((v) => v.variant === variantId);
    const done = () => this.loadAssociates();

    if (existing) {
      this.associateService.deleteAssociateVariant(existing.id).subscribe({ next: done });
    } else {
      this.associateService
        .createAssociateVariant({ associate: a.id, variant: variantId })
        .subscribe({
          next: done,
          error: () => {
            this.error = 'No se pudo asignar el módulo.';
            this.cdr.detectChanges();
          },
        });
    }
  }

  private emptyForm(): CreateAssociatePayload {
    return {
      user: 0,
      dni: '',
      cbu: '',
      entry_date: '',
      base_hours: 8,
      personal_email: '',
      phone_number: '',
      address: '',
    };
  }
}
