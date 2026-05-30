import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { Modulo } from '../interfaces/Modulo';
import { API_BASE_URL } from '../core/api/api.config';

@Injectable({
  providedIn: 'root',
})
export class ModulosService {
  constructor(private http: HttpClient) {}

  public getModulos(): Observable<Modulo[]> {
    return this.http.get<Modulo[]>(`${API_BASE_URL}/modules/`);
  }

  public createModulo(modulo: Modulo): Observable<Modulo> {
    return this.http.post<Modulo>(`${API_BASE_URL}/modules/`, modulo);
  }

  public updateModulo(id: number, modulo: Partial<Modulo>): Observable<Modulo> {
    return this.http.patch<Modulo>(`${API_BASE_URL}/modules/${id}/`, modulo);
  }

  public deleteModulo(id: number): Observable<void> {
    return this.http.delete<void>(`${API_BASE_URL}/modules/${id}/`);
  }
}