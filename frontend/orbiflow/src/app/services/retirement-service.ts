import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { API_BASE_URL } from '../core/api/api.config';
import { Observable } from 'rxjs';
import { Retirement } from '../interfaces/Retirement';

@Injectable({
  providedIn: 'root',
})
export class RetirementService {
  constructor(private http: HttpClient) {}

  // Obtener todos los recibos
  public getRetirements(): Observable<Retirement[]> {
    return this.http.get<Retirement[]>(`${API_BASE_URL}/retirements/`);
  }

  // Obtener recibo por id
  public getRetirementById(id: number): Observable<Retirement> {
    return this.http.get<Retirement>(`${API_BASE_URL}/retirements/${id}/`);
  }

  // Obtener todos los recibos de un asociado
  public getRetirementsByAssociate(id: number): Observable<Retirement[]> {
    return this.http.get<Retirement[]>(`${API_BASE_URL}/retirements/?associate=${id}`);
  }
}
