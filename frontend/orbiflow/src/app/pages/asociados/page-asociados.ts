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

type AssociateFormField =
  | 'user'
  | 'dni'
  | 'cbu'
  | 'entry_date'
  | 'base_hours'
  | 'personal_email'
  | 'phone_number'
  | 'address'
  | 'emergency_contact';

type AssociateFormErrors = Partial<Record<AssociateFormField, string>>;

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
  formErrors: AssociateFormErrors = {};
  formErrorSummary: string[] = [];

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
  
  // ──  Referencia global de módulos ──
  allModules: ModuleCatalog[] = []; 

  formData: CreateAssociatePayload = this.emptyForm();
  emergencyContactInput = ''; // campo aparte: el backend espera un objeto JSON
  selectedUserEmail = '';     // solo lectura, se autocompleta al elegir usuario
  readonly todayIso = this.toLocalIsoDate(new Date());

  private readonly validationSummaryMessage = 'Revisá los datos marcados.';
  private readonly emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

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
    //  Se Carg el catálogo de módulos primero para poder filtrar visualmente 
    this.associateService.getModules().subscribe((mods) => {
      this.allModules = Array.isArray(mods) ? mods : [];
      this.loadAssociates();
    });
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
    this.clearFormFeedback();
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
    this.clearFieldError('user');
  }

  // Precarga el formulario con los datos del asociado y abre en modo edición
  openEditModal(associate: Associate): void {
    this.modalMode = 'edit';
    this.selectedAssociate = associate;
    this.clearFormFeedback();
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
    this.clearFormFeedback();
  }

  // Valida el formulario, construye el payload y llama a crear o actualizar
  submitForm(): void {
    this.clearFormFeedback();

    if (!this.validateAssociateForm()) {
      return;
    }

    const payload = this.buildAssociatePayload();
    let req: Observable<Associate>;

    if (this.modalMode === 'create') {
      req = this.associateService.createAssociate(payload);
    } else {
      const selectedAssociate = this.selectedAssociate;
      if (!selectedAssociate) {
        this.modalError = 'No se pudo identificar el legajo a editar.';
        return;
      }
      req = this.associateService.updateAssociate(selectedAssociate.id, payload);
    }

    req.subscribe({
      next: () => {
        this.closeModal();
        this.loadAssociates();
        const title = this.modalMode === 'create' ? 'Legajo creado' : 'Legajo actualizado';
        const subtitle = this.modalMode === 'create' ? 'El legajo se creó correctamente.' : 'Los cambios se guardaron correctamente.';
        this.lanzarToast(title, subtitle);
      },
      error: (err) => {
        this.applyBackendErrors(err?.error);
        this.cdr.detectChanges();
      },
    });
  }

  // Activa / desactiva el estado del asociado.
  // El campo is_active es un @property del modelo Associate que lee user.is_active,
  // por lo que se persiste actualizando el User vinculado.
  toggleStatus(associate: Associate): void {
    const newStatus = !associate.is_active;

    this.userService.updateUser(associate.user, { is_active: newStatus }).subscribe({
      next: () => {
        associate.is_active = newStatus;
        this.cdr.detectChanges();
        const label = newStatus ? 'activado' : 'desactivado';
        this.lanzarToast('Estado actualizado', `${associate.full_name} fue ${label}.`);
      },
      error: () => {
        this.lanzarToast('Error', 'No se pudo cambiar el estado del asociado.');
      },
    });
  }

  // ── Modal CU-06: gestión de módulos ──

  // Carga el catálogo, inicializa el estado temporal y abre el modal
  openModulesModal(associate: Associate): void {
    this.selectedAssociate = associate;
    this.savingModules = false;

    this.associateService.getModules().subscribe({
      next: (modules) => {
        // Se quita el filter para que la vista renderice los inactivos
        this.modulesCatalog = Array.isArray(modules) ? modules : [];
        this.allModules = this.modulesCatalog; // Se mantiene la referencia global actualizada

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

    // Si el módulo globalmente está inactivo, se inactiva en el modal
    if (!mod.is_active) return false;

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
      this.lanzarToast('Módulos actualizados', 'Los cambios se guardaron correctamente.');
      return;
    }

    let completed = 0;
    let hasError = false;
    const finish = (success: boolean) => {
      if (!success) {
        hasError = true;
      }
      completed++;
      if (completed === all.length) {
        this.savingModules = false;
        this.closeModulesModal();
        this.loadAssociates();
        if (hasError) {
          this.lanzarToast('Error al guardar', 'Algunos cambios de módulos no pudieron aplicarse.');
        } else {
          this.lanzarToast('Módulos actualizados', 'Los módulos se asignaron correctamente.');
        }
      }
    };

    all.forEach((req) => req.subscribe({
      next: () => finish(true),
      error: () => finish(false)
    }));
  }

  clearFieldError(field: AssociateFormField): void {
    if (!this.formErrors[field]) return;

    const next = { ...this.formErrors };
    delete next[field];
    this.formErrors = next;
    this.formErrorSummary = this.getFormErrorSummary(next);

    if (this.formErrorSummary.length === 0 && this.modalError === this.validationSummaryMessage) {
      this.modalError = null;
    }
  }

  private lanzarToast(titulo: string, subtitulo: string): void {
    this.toastTitle = titulo;
    this.toastSubtitle = subtitulo;
    this.mostrarToast = true;
    this.cdr.detectChanges();

    setTimeout(() => {
      this.mostrarToast = false;
      this.cdr.detectChanges();
    }, 3000);
  }

  private clearFormFeedback(): void {
    this.modalError = null;
    this.formErrors = {};
    this.formErrorSummary = [];
  }

  private validateAssociateForm(): boolean {
    const errors: AssociateFormErrors = {};

    const userId = Number(this.formData.user);
    if (this.modalMode === 'create' && (!Number.isInteger(userId) || userId <= 0)) {
      this.addFormError(errors, 'user', 'Seleccioná un usuario para vincular el legajo.');
    }

    const dni = this.formData.dni.trim();
    if (!dni) {
      this.addFormError(errors, 'dni', 'Completá el DNI.');
    } else if (!/^\d{7,8}$/.test(dni)) {
      this.addFormError(errors, 'dni', 'El DNI debe tener 7 u 8 dígitos.');
    }

    const entryDate = this.formData.entry_date.trim();
    if (!entryDate) {
      this.addFormError(errors, 'entry_date', 'Completá la fecha de ingreso.');
    } else if (!this.isValidIsoDate(entryDate)) {
      this.addFormError(errors, 'entry_date', 'Ingresá una fecha de ingreso válida.');
    } else if (entryDate > this.todayIso) {
      this.addFormError(errors, 'entry_date', 'La fecha de ingreso no puede ser futura.');
    }

    const cbu = this.formData.cbu.trim();
    if (!cbu) {
      this.addFormError(errors, 'cbu', 'Completá el CBU.');
    } else if (!/^\d{22}$/.test(cbu)) {
      this.addFormError(errors, 'cbu', 'El CBU debe tener 22 dígitos.');
    }

    const baseHoursRaw = String(this.formData.base_hours ?? '').trim();
    const baseHours = Number(baseHoursRaw);
    if (!baseHoursRaw) {
      this.addFormError(errors, 'base_hours', 'Completá la jornada base.');
    } else if (!Number.isFinite(baseHours) || !Number.isInteger(baseHours) || baseHours < 1 || baseHours > 12) {
      this.addFormError(errors, 'base_hours', 'La jornada base debe ser un número entero entre 1 y 12.');
    }

    const personalEmail = this.formData.personal_email.trim();
    if (!personalEmail) {
      this.addFormError(errors, 'personal_email', 'Completá el email personal.');
    } else if (!this.emailPattern.test(personalEmail)) {
      this.addFormError(errors, 'personal_email', 'Ingresá un email personal válido.');
    }

    const phone = this.formData.phone_number.trim();
    if (!phone) {
      this.addFormError(errors, 'phone_number', 'Completá el teléfono.');
    } else if (!/^[0-9+() .-]{6,20}$/.test(phone)) {
      this.addFormError(errors, 'phone_number', 'Ingresá un teléfono válido.');
    }

    const address = this.formData.address.trim();
    if (!address) {
      this.addFormError(errors, 'address', 'Completá el domicilio.');
    } else if (address.length > 255) {
      this.addFormError(errors, 'address', 'El domicilio no puede superar 255 caracteres.');
    }

    this.formErrors = errors;
    this.formErrorSummary = this.getFormErrorSummary(errors);
    this.modalError = this.formErrorSummary.length > 0 ? this.validationSummaryMessage : null;

    return this.formErrorSummary.length === 0;
  }

  private buildAssociatePayload(): CreateAssociatePayload {
    const emergencyContact = this.emergencyContactInput.trim();

    return {
      user: Number(this.formData.user),
      dni: this.formData.dni.trim(),
      cbu: this.formData.cbu.trim(),
      entry_date: this.formData.entry_date.trim(),
      base_hours: Number(this.formData.base_hours),
      personal_email: this.formData.personal_email.trim(),
      phone_number: this.formData.phone_number.trim(),
      address: this.formData.address.trim(),
      emergency_contact: emergencyContact ? { contact: emergencyContact } : {},
    };
  }

  private applyBackendErrors(errorBody: unknown): void {
    if (!errorBody || typeof errorBody !== 'object' || Array.isArray(errorBody)) {
      this.modalError = 'No se pudo guardar el legajo.';
      return;
    }

    const errors: AssociateFormErrors = {};
    const globalErrors: string[] = [];

    Object.entries(errorBody as Record<string, unknown>).forEach(([key, value]) => {
      const detail = this.extractBackendDetail(value);
      const message = this.mapBackendErrorMessage(key, detail);
      const field = this.backendKeyToFormField(key);

      if (key === 'user' && this.isDuplicateError(detail)) {
        this.availableUsers = this.availableUsers.filter(
          (u) => u.id !== this.formData.user,
        );
        this.formData.user = 0;
        this.selectedUserEmail = '';
      }

      if (field) {
        this.addFormError(errors, field, message);
      } else {
        globalErrors.push(message);
      }
    });

    this.formErrors = errors;
    this.formErrorSummary = [
      ...this.getFormErrorSummary(errors),
      ...globalErrors,
    ];
    this.modalError = Object.keys(errors).length > 0
      ? this.validationSummaryMessage
      : (globalErrors[0] ?? 'No se pudo guardar el legajo.');
  }

  private addFormError(
    errors: AssociateFormErrors,
    field: AssociateFormField,
    message: string,
  ): void {
    errors[field] ??= message;
  }

  private getFormErrorSummary(errors: AssociateFormErrors): string[] {
    return Object.values(errors).filter((value): value is string => Boolean(value));
  }

  private backendKeyToFormField(key: string): AssociateFormField | null {
    switch (key) {
      case 'user':
      case 'dni':
      case 'cbu':
      case 'entry_date':
      case 'base_hours':
      case 'personal_email':
      case 'phone_number':
      case 'address':
      case 'emergency_contact':
        return key;
      default:
        return null;
    }
  }

  private mapBackendErrorMessage(key: string, detail: string): string {
    switch (key) {
      case 'user':
        if (this.isRequiredError(detail)) return 'Seleccioná un usuario para vincular el legajo.';
        if (this.isDuplicateError(detail)) return 'El usuario ya tiene un legajo y no puede volver a ser registrado.';
        return 'El usuario seleccionado no es válido.';

      case 'dni':
        if (this.isRequiredError(detail)) return 'Completá el DNI.';
        if (this.isDuplicateError(detail)) return 'El DNI ya está registrado.';
        if (this.isMaxLengthError(detail)) return 'El DNI no puede superar 8 dígitos.';
        return 'Ingresá un DNI válido.';

      case 'cbu':
        if (this.isRequiredError(detail)) return 'Completá el CBU.';
        if (this.isDuplicateError(detail)) return 'El CBU ya está registrado.';
        if (this.isMaxLengthError(detail)) return 'El CBU no puede superar 22 dígitos.';
        return 'El CBU debe tener 22 dígitos.';

      case 'entry_date':
        if (this.isRequiredError(detail)) return 'Completá la fecha de ingreso.';
        return 'Ingresá una fecha de ingreso válida.';

      case 'base_hours':
        if (this.isRequiredError(detail)) return 'Completá la jornada base.';
        return 'La jornada base debe ser un número entero entre 1 y 12.';

      case 'personal_email':
        if (this.isRequiredError(detail)) return 'Completá el email personal.';
        if (this.isDuplicateError(detail)) return 'El email personal ya está registrado.';
        return 'Ingresá un email personal válido.';

      case 'phone_number':
        if (this.isRequiredError(detail)) return 'Completá el teléfono.';
        if (this.isMaxLengthError(detail)) return 'El teléfono no puede superar 20 caracteres.';
        return 'Ingresá un teléfono válido.';

      case 'address':
        if (this.isRequiredError(detail)) return 'Completá el domicilio.';
        if (this.isMaxLengthError(detail)) return 'El domicilio no puede superar 255 caracteres.';
        return 'Revisá el domicilio.';

      case 'emergency_contact':
        if (this.isRequiredError(detail)) return 'Completá el contacto de emergencia.';
        return 'Revisá el contacto de emergencia.';

      case 'detail':
      case 'message':
      case 'error':
      case 'non_field_errors':
        return detail || 'No se pudo guardar el legajo.';

      default:
        return detail ? `${key}: ${detail}` : 'No se pudo guardar el legajo.';
    }
  }

  private extractBackendDetail(value: unknown): string {
    if (Array.isArray(value)) {
      return value
        .map((item) => this.extractBackendDetail(item))
        .find((item) => item.length > 0) ?? '';
    }

    if (value && typeof value === 'object') {
      const record = value as Record<string, unknown>;
      const directValue = record['detail'] ?? record['message'] ?? record['error'];
      if (directValue) return this.extractBackendDetail(directValue);

      const nestedValue = Object.values(record)
        .map((item) => this.extractBackendDetail(item))
        .find((item) => item.length > 0);
      return nestedValue ?? '';
    }

    return value == null ? '' : String(value);
  }

  private isRequiredError(detail: string): boolean {
    const text = this.normalizeErrorDetail(detail);
    return [
      'required',
      'blank',
      'null',
      'empty',
      'may not be blank',
      'may not be null',
      'this field is required',
      'este campo es requerido',
      'no puede estar en blanco',
      'no puede ser nulo',
      'no puede estar vacío',
    ].some((fragment) => text.includes(fragment));
  }

  private isDuplicateError(detail: string): boolean {
    const text = this.normalizeErrorDetail(detail);
    return [
      'already exists',
      'already registered',
      'already in use',
      'unique',
      'ya existe',
      'ya está registrado',
      'ya esta registrado',
      'duplicado',
    ].some((fragment) => text.includes(fragment));
  }

  private isMaxLengthError(detail: string): boolean {
    const text = this.normalizeErrorDetail(detail);
    return [
      'no more than',
      'max_length',
      'maximum',
      'más de',
      'mas de',
      'máximo',
      'maximo',
    ].some((fragment) => text.includes(fragment));
  }

  private normalizeErrorDetail(detail: string): string {
    return detail.trim().toLowerCase();
  }

  private isValidIsoDate(value: string): boolean {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;

    const date = new Date(`${value}T00:00:00`);
    return !Number.isNaN(date.getTime()) && this.toLocalIsoDate(date) === value;
  }

  private toLocalIsoDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
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

    // Filtramos las variantes para mostrar solo las que pertenecen a módulos activos
    const activeVariants = associate.variants.filter((v) => {
      const mod = this.allModules.find((m) => m.name === v.module_name);
      return mod ? mod.is_active : false;
    });

    const moduleNames = activeVariants.map((v) => v.module_name);
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