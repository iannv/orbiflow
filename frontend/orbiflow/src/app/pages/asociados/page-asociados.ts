import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Observable } from 'rxjs';

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
import { Loader } from '../../components/loader/loader';
import { Toast } from '../../components/toast/toast';

@Component({
  selector: 'app-page-asociados',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    BaseCard,
    Chip,
    Modal,
    Primary,
    Secondary,
    Action,
    Loader,
    Toast
  ],
  templateUrl: './page-asociados.html',
  styleUrls: ['../profile/profile.css', './page-asociados.css'],
})
export class PageAsociados implements OnInit {
  // ── Lista de asociados ──
  associateList: Associate[] = [];
  filteredList: Associate[] = [];

  // ── Estados de UI ──
  loading = true;
  error: string | null = null;
  modalError: string | null = null;

  // ── Toast de notificación ──
  mostrarToast = false;
  toastTitle = '';
  toastSubtitle = '';

  // ── Búsqueda, ordenamiento y paginación ──
  searchQuery = '';
  sortField: 'first_name' | 'last_name' = 'last_name';
  sortAsc = true;
  currentPage = 1;
  readonly pageSize = 5;
  readonly ellipsis = '…';

  // ── Visibilidad de modales ──
  showModal = false;        // CU-05: crear / editar legajo
  showModulesModal = false; // CU-06: gestionar módulos
  modalMode: 'create' | 'edit' = 'create';

  // ── Datos de los modales ──
  selectedAssociate: Associate | null = null;
  availableUsers: User[] = [];
  modulesCatalog: ModuleCatalog[] = [];
  formData: CreateAssociatePayload = this.emptyForm();
  emergencyContactInput = ''; // campo aparte: el backend espera un objeto JSON
  selectedUserEmail = '';     // solo lectura, se autocompleta al elegir usuario

  // ── Estado temporal CU-06 ──
  // Los toggles modifican este Set; se persiste en el backend solo al confirmar
  pendingVariantIds = new Set<number>();
  savingModules = false;

  constructor(
    private readonly associateService: AssociateService,
    private readonly userService: UserService,
    private readonly cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.loadAssociates();
  }

  // ── Carga de la lista de asociados ──
  // NOTA: el backend filtra is_deleted=False por defecto (AssociateViewSet en views.py).
  // Para mostrar asociados inactivos, cambiar el queryset a:
  // Associate.objects.all().select_related('user')

  loadAssociates(): void {
    this.loading = true;
    this.error = null;

    this.associateService.getAssociates().subscribe({
      next: (data) => {
        // Guarda el id antes de recargar para re-sincronizar selectedAssociate
        const selectedId = this.selectedAssociate?.id;

        this.associateList = (Array.isArray(data) ? data : []).map((a) => ({
          ...a,
          variants: a.variants ?? [],
        }));

        if (selectedId) {
          this.selectedAssociate =
            this.associateList.find((a) => a.id === selectedId) ?? null;
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

  // ── Búsqueda y ordenamiento ──

  // Filtra y ordena la lista según la búsqueda y el campo de ordenamiento activo
  applyFilters(): void {
    const q = this.searchQuery.trim().toLowerCase();

    const result = this.associateList.filter((a) => {
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

  // Alterna dirección si el campo ya está activo, o cambia de campo
  setSort(field: 'first_name' | 'last_name'): void {
    if (this.sortField === field) {
      this.sortAsc = !this.sortAsc;
    } else {
      this.sortField = field;
      this.sortAsc = true;
    }
    this.applyFilters();
  }

  // ── Paginación ──

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.filteredList.length / this.pageSize));
  }

  // Devuelve solo los asociados de la página actual
  get paginatedList(): Associate[] {
    const start = (this.currentPage - 1) * this.pageSize;
    return this.filteredList.slice(start, start + this.pageSize);
  }

  // Genera la secuencia de botones con elipsis para páginas grandes
  get pageNumbers(): (number | string)[] {
    const total = this.totalPages;
    const current = this.currentPage;
    if (total <= 7) {
      return Array.from({ length: total }, (_, i) => i + 1);
    }
    const pages: (number | string)[] = [1, 2];
    if (current > 4) pages.push(this.ellipsis);
    for (let i = Math.max(3, current - 1); i <= Math.min(total - 2, current + 1); i++) {
      pages.push(i);
    }
    if (current < total - 3) pages.push(this.ellipsis);
    pages.push(total - 1, total);
    return pages;
  }

  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
    }
  }

  // ── Modal CU-05: crear / editar legajo ──

  // Carga usuarios disponibles y abre el modal en modo creación
  openCreateModal(): void {
    this.modalMode = 'create';
    this.selectedAssociate = null;
    this.formData = this.emptyForm();
    this.availableUsers = [];
    this.modalError = null;
    this.emergencyContactInput = '';
    this.selectedUserEmail = '';

    this.userService.getUsers().subscribe({
      next: (users) => {
        // Excluye usuarios ya vinculados a un legajo, eliminados, o que no sean coop members
        const linked = new Set<number>(
          this.associateList.map((a) => a.user).filter((v): v is number => typeof v === 'number'),
        );
        // Permitir usuarios que sean coop members (necesitan legajo, independientemente del rol)
        this.availableUsers = users.filter(
          (u) => u.is_coop_member && u.id != null && !linked.has(u.id) && !u.is_deleted,
        );
        console.log('Available users for new associate:', this.availableUsers);
        // Abre el modal solo cuando el select ya tiene opciones cargadas
        this.showModal = true;
        this.cdr.detectChanges();
      },
      error: () => {
        this.error = 'No se pudieron cargar los usuarios disponibles.';
        this.cdr.detectChanges();
      },
    });
  }

  // Autocompleta el email de trabajo al seleccionar un usuario
  onUserSelect(userId: number): void {
    const u = this.availableUsers.find((x) => x.id === userId);
    this.selectedUserEmail = u?.email ?? '';
    this.modalError = null;
  }

  // Precarga el formulario con los datos del asociado y abre en modo edición
  openEditModal(associate: Associate): void {
    this.modalMode = 'edit';
    this.selectedAssociate = associate;
    this.modalError = null;
    this.emergencyContactInput =
      associate.emergency_contact?.['contact']?.toString() ?? '';
    this.formData = {
      user: associate.user,
      dni: associate.dni,
      cbu: associate.cbu,
      entry_date: associate.entry_date,
      base_hours: associate.base_hours,
      personal_email: associate.personal_email,
      phone_number: associate.phone_number,
      address: associate.address,
      emergency_contact: associate.emergency_contact ?? null,
    };
    this.showModal = true;
  }

  closeModal(): void {
    this.showModal = false;
    this.modalError = null;
  }

  // Valida el formulario, construye el payload y llama a crear o actualizar
  submitForm(): void {
    this.modalError = null;

    if (this.modalMode === 'create' && !this.formData.user) {
      this.modalError = 'Seleccioná un usuario.';
      return;
    }

    if (!/^\d{22}$/.test(this.formData.cbu.trim())) {
      this.modalError = 'El CBU debe tener 22 dígitos.';
      return;
    }

    const payload: CreateAssociatePayload = {
      user: Number(this.formData.user),
      dni: this.formData.dni.trim(),
      cbu: this.formData.cbu.trim(),
      entry_date: this.formData.entry_date,
      base_hours: Number(this.formData.base_hours),
      personal_email: this.formData.personal_email.trim(),
      phone_number: this.formData.phone_number.trim(),
      address: this.formData.address.trim(),
      emergency_contact: this.emergencyContactInput.trim()
        ? { contact: this.emergencyContactInput.trim() }
        : null,
    };
    const req =
      this.modalMode === 'create'
        ? this.associateService.createAssociate(payload)
        : this.associateService.updateAssociate(
            this.selectedAssociate!.id,
            payload,
          );

    req.subscribe({
      next: () => {
        this.closeModal();
        this.loadAssociates();
        // Mostrar toast de éxito
        this.toastTitle = this.modalMode === 'create' ? 'Legajo creado' : 'Legajo actualizado';
        this.toastSubtitle = this.modalMode === 'create' ? 'El legajo se creó correctamente' : 'Los cambios se guardaron correctamente';
        this.mostrarToast = true;
        setTimeout(() => this.mostrarToast = false, 3000);
      },
      error: (err) => {
        // Mapea los errores del backend a mensajes legibles en español
        if (err?.error) {
          const backendErrors = err.error;
          const messages: string[] = [];

          Object.keys(backendErrors).forEach((key) => {
            const detail = Array.isArray(backendErrors[key])
              ? backendErrors[key][0]
              : backendErrors[key];

            switch (key) {
              case 'user':
                if (String(detail).includes('already exists')) {
                  this.availableUsers = this.availableUsers.filter(
                    (u) => u.id !== this.formData.user,
                  );
                  this.formData.user = 0;
                  this.selectedUserEmail = '';
                  messages.push('El usuario ya tiene un legajo y no puede volver a ser registrado.');
                } else {
                  messages.push('El usuario seleccionado no es válido.');
                }
                break;

              case 'dni':
                messages.push('El DNI ya está registrado.');
                break;

              case 'cbu':
                messages.push('El CBU ya está registrado.');
                break;

              case 'personal_email':
                messages.push('El email personal ya está registrado.');
                break;

              case 'phone_number':
                messages.push('Falta completar el teléfono.');
                break;

              case 'address':
                messages.push('Falta completar el domicilio.');
                break;

              case 'entry_date':
                messages.push('Falta completar la fecha de ingreso.');
                break;

              case 'emergency_contact':
                messages.push('Falta completar el contacto de emergencia.');
                break;

              case 'work_email':
                messages.push('El email laboral es inválido.');
                break;

              case 'non_field_errors':
                messages.push(String(detail));
                break;

              default:
                messages.push(`${key}: ${detail}`);
                break;
            }
          });

          this.modalError = messages.join(' ');
        } else {
          this.modalError = 'No se pudo guardar el legajo.';
        }

        this.cdr.detectChanges();
      },
    });
  }

  // Activa / desactiva visualmente el estado del asociado.
  // Nota: is_deleted es read_only en el backend, este cambio es solo local.
  toggleStatus(associate: Associate): void {
    associate.is_deleted = !associate.is_deleted;
    this.cdr.detectChanges();
  }

  // ── Modal CU-06: gestión de módulos ──

  // Carga el catálogo, inicializa el estado temporal y abre el modal
  openModulesModal(associate: Associate): void {
    this.selectedAssociate = associate;
    this.savingModules = false;

    this.associateService.getModules().subscribe({
      next: (modules) => {
        this.modulesCatalog = (Array.isArray(modules) ? modules : []).filter(
          (x) => x.is_active,
        );
        // Copia los IDs ya asignados como punto de partida del estado temporal
        this.pendingVariantIds = new Set(
          associate.variants?.map((v) => v.variant) ?? [],
        );
        this.showModulesModal = true;
        this.cdr.detectChanges();
      },
      error: () => {
        this.error = 'No se pudieron cargar los módulos.';
        this.cdr.detectChanges();
      },
    });
  }

  // Cierra descartando los cambios (botón Cancelar)
  cancelModulesModal(): void {
    this.showModulesModal = false;
    this.pendingVariantIds = new Set();
  }

  // Cierra sin limpiar pendingVariantIds (uso interno tras guardar)
  closeModulesModal(): void {
    this.showModulesModal = false;
  }

  // ── Gestión de módulos agrupados ──

  // Devuelve true si la variante está marcada en el estado temporal
  isAssigned(variantId: number): boolean {
    return this.pendingVariantIds.has(variantId);
  }

  // Alterna la variante en el Set temporal (checkbox - módulos no exclusivos)
  toggleVariant(variantId: number): void {
    if (this.pendingVariantIds.has(variantId)) {
      this.pendingVariantIds.delete(variantId);
    } else {
      this.pendingVariantIds.add(variantId);
    }
    this.cdr.detectChanges();
  }

  // Devuelve true si el módulo tiene al menos una variante seleccionada
  isModuleActive(modId: number): boolean {
    const mod = this.modulesCatalog.find((m) => m.id === modId);
    if (!mod) return false;
    return mod.variants.some((v) => this.pendingVariantIds.has(v.id));
  }

  // Activa/desactiva un módulo completo
  // - Al activar: selecciona la variante por defecto (o la primera si no hay)
  // - Al desactivar: elimina todas las variantes de ese módulo del Set
  toggleModule(modId: number): void {
    const mod = this.modulesCatalog.find((m) => m.id === modId);
    if (!mod) return;

    const hasAnySelected = mod.variants.some((v) => this.pendingVariantIds.has(v.id));

    if (hasAnySelected) {
      // Desactivar: eliminar todas las variantes de este módulo
      mod.variants.forEach((v) => this.pendingVariantIds.delete(v.id));
    } else {
      // Activar: buscar variante por defecto, o usar la primera
      const defaultVariant = mod.variants.find((v) => v.is_default);
      const variantToSelect = defaultVariant ?? mod.variants[0];
      if (variantToSelect) {
        this.pendingVariantIds.add(variantToSelect.id);
      }
    }
    this.cdr.detectChanges();
  }

  // Selecciona una variante en un módulo exclusivo (radio button)
  // Elimina cualquier otra variante del mismo módulo antes de agregar la nueva
  selectExclusiveVariant(modId: number, variantId: number): void {
    const mod = this.modulesCatalog.find((m) => m.id === modId);
    if (!mod) return;

    // Eliminar todas las variantes de este módulo del Set
    mod.variants.forEach((v) => this.pendingVariantIds.delete(v.id));
    // Agregar solo la seleccionada
    this.pendingVariantIds.add(variantId);
    this.cdr.detectChanges();
  }

  // Calcula la diferencia con el estado original y ejecuta solo los cambios necesarios
  saveModules(): void {
    const associate = this.selectedAssociate;
    if (!associate) return;

    this.savingModules = true;

    const originalIds = new Set(associate.variants?.map((v) => v.variant) ?? []);
    const toAdd    = [...this.pendingVariantIds].filter((id) => !originalIds.has(id));
    const toRemove = associate.variants?.filter((v) => !this.pendingVariantIds.has(v.variant)) ?? [];

    const deletes: Observable<unknown>[] = toRemove.map((v) =>
      this.associateService.deleteAssociateVariant(v.id),
    );
    const creates: Observable<unknown>[] = toAdd.map((variantId) =>
      this.associateService.createAssociateVariant({ associate: associate.id, variant: variantId }),
    );

    const all: Observable<unknown>[] = [...deletes, ...creates];

    if (all.length === 0) {
      this.closeModulesModal();
      return;
    }

    // Espera a que todas las llamadas terminen (éxito o error) para cerrar y recargar
    let completed = 0;
    const finish = () => {
      completed++;
      if (completed === all.length) {
        this.savingModules = false;
        this.closeModulesModal();
        this.loadAssociates();
      }
    };

    all.forEach((req) => req.subscribe({ next: finish, error: finish }));
  }

  // ── Helpers ──

  // Devuelve '$ 20.000' o '10 %' según el tipo de la variante
  formatVariantValue(variant: ModuleCatalog['variants'][number]): string {
    const num = Number(variant.value);
    return variant.type === 'fixed_amount'
      ? `$ ${num.toLocaleString('es-AR')}`
      : `${num} %`;
  }

  // Retorna los nombres de módulos únicos (sin duplicados) para mostrar en los tags
  getUniqueModuleNames(associate: Associate): string[] {
    if (!associate.variants || associate.variants.length === 0) {
      return [];
    }
    const moduleNames = associate.variants.map((v) => v.module_name);
    return [...new Set(moduleNames)];
  }

  // Retorna un formulario vacío con valores por defecto
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
      emergency_contact: null,
    };
  }
}