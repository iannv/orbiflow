import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../core/api/api.config';

export interface GlobalConfig {
  id?: number;
  change_date?: string;
  hour_value: string | number;
  cap_percentage: string | number;
  user?: number;
  user_name?: string;
}

@Injectable({
  providedIn: 'root'
})
export class ConfiguracionService {
  private readonly http = inject(HttpClient);
  private readonly endpoint = `${API_BASE_URL}/config/`;

  getConfigs(): Observable<GlobalConfig[]> {
    return this.http.get<GlobalConfig[]>(this.endpoint);
  }

  // Al crear una nueva configuración, esta pasa a ser la "Actual" en el backend
  createConfig(config: { hour_value: string | number, cap_percentage: string | number }): Observable<GlobalConfig> {
    return this.http.post<GlobalConfig>(this.endpoint, config);
  }
}