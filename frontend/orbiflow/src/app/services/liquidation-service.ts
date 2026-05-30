import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../core/api/api.config';
import {
  LiquidationPeriod,
  UploadHoursPayload,
  LiquidationSummary,
} from '../interfaces/Liquidation';

@Injectable({
  providedIn: 'root',
})
export class LiquidationService {
  private apiUrl = `${API_BASE_URL}/liquidations/`;

  constructor(private http: HttpClient) {}

  getGlobalConfig(): Observable<any> {
    return this.http.get<any>(`${API_BASE_URL}/config/`);
  }

  getPeriods(status?: string): Observable<LiquidationPeriod[]> {
    const url = status ? `${this.apiUrl}?status=${status}` : this.apiUrl;
    return this.http.get<LiquidationPeriod[]>(url);
  }

  createPeriod(period: Partial<LiquidationPeriod>): Observable<LiquidationPeriod> {
    return this.http.post<LiquidationPeriod>(this.apiUrl, period);
  }

  updatePeriodStatus(
    id: number,
    status: 'open' | 'reviewed' | 'closed',
  ): Observable<LiquidationPeriod> {
    return this.http.patch<LiquidationPeriod>(`${this.apiUrl}${id}/`, { status });
  }

  uploadHours(id: number, payload: UploadHoursPayload): Observable<any> {
    return this.http.post(`${this.apiUrl}${id}/upload-hours/`, payload);
  }

  calculate(id: number, testMode: boolean): Observable<any> {
    return this.http.post(`${this.apiUrl}${id}/calculate/`, { test_mode: testMode });
  }

  getSummary(id: number): Observable<LiquidationSummary> {
    return this.http.get<LiquidationSummary>(`${this.apiUrl}${id}/summary/`);
  }

  getRetirementsByLiquidation(id: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}${id}/retirements/`);
  }
}
