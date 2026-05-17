import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { API_BASE_URL } from '../core/api/api.config';
import { Associate, AssociateVariant, CreateAssociatePayload } from '../interfaces/Associate';

export interface ModuleCatalogVariant {
  id: number;
  module?: number;
  name: string;
  type: 'fixed_amount' | 'percentage';
  value: string | number;
  is_default: boolean;
}

export interface ModuleCatalog {
  id: number;
  name: string;
  description?: string;
  applies_to_cap?: boolean;
  calculation_type?: 'simple' | 'seniority';
  is_exclusive?: boolean;
  is_active: boolean;
  variants: ModuleCatalogVariant[];
}

@Injectable({
  providedIn: 'root',
})
export class AssociateService {
  constructor(private readonly http: HttpClient) {}

  getAssociates(): Observable<Associate[]> {
    return this.http.get<Associate[]>(`${API_BASE_URL}/associates/`);
  }

  getAssociate(id: number): Observable<Associate> {
    return this.http.get<Associate>(`${API_BASE_URL}/associates/${id}/`);
  }

  getAssociateByUser(userId: number): Observable<Associate[]> {
    return this.http.get<Associate[]>(`${API_BASE_URL}/associates/?user=${userId}`);
  }

  createAssociate(payload: CreateAssociatePayload): Observable<Associate> {
    return this.http.post<Associate>(`${API_BASE_URL}/associates/`, payload);
  }

  updateAssociate(id: number, payload: Partial<CreateAssociatePayload>): Observable<Associate> {
    return this.http.patch<Associate>(`${API_BASE_URL}/associates/${id}/`, payload);
  }

  toggleAssociateStatus(id: number, isDeleted: boolean): Observable<Associate> {
    return this.http.patch<Associate>(`${API_BASE_URL}/associates/${id}/`, { is_deleted: isDeleted });
  }

  deleteAssociate(id: number): Observable<void> {
    return this.http.delete<void>(`${API_BASE_URL}/associates/${id}/`);
  }

  getModules(): Observable<ModuleCatalog[]> {
    return this.http.get<ModuleCatalog[]>(`${API_BASE_URL}/modules/`);
  }

  createAssociateVariant(payload: { associate: number; variant: number }): Observable<AssociateVariant> {
    return this.http.post<AssociateVariant>(`${API_BASE_URL}/associate-variants/`, payload);
  }

  deleteAssociateVariant(id: number): Observable<void> {
    return this.http.delete<void>(`${API_BASE_URL}/associate-variants/${id}/`);
  }
}