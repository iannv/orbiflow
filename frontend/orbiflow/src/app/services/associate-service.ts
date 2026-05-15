import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { API_BASE_URL } from '../core/api/api.config';
import { Associate } from '../interfaces/Associate';

@Injectable({
  providedIn: 'root',
})
export class AssociateService {
  constructor(private readonly http: HttpClient) {}

  public getAssociate(id: number): Observable<Associate> {
    return this.http.get<Associate>(`${API_BASE_URL}/associates/${id}`);
  }

  public getAssociates(): Observable<Associate[]> {
    return this.http.get<Associate[]>(`${API_BASE_URL}/associates/`);
  }

  public getAssociateByUser(userId: number): Observable<Associate[]> {
    return this.http.get<Associate[]>(`${API_BASE_URL}/associates/?user=${userId}`);
  }
}
