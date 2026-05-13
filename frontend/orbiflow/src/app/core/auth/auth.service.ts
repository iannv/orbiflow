import { HttpClient } from '@angular/common/http';
import { Injectable, computed, signal } from '@angular/core';
import { tap } from 'rxjs';

import { API_BASE_URL } from '../api/api.config';
import { AuthUser, LoginResponse, UserRole } from './auth.models';

const ACCESS_TOKEN_KEY = 'orbiflow_access_token';
const REFRESH_TOKEN_KEY = 'orbiflow_refresh_token';
const USER_KEY = 'orbiflow_user';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly currentUserSignal = signal<AuthUser | null>(this.getStoredUser());

  readonly currentUser = this.currentUserSignal.asReadonly();
  readonly isAuthenticated = computed(() => Boolean(this.currentUserSignal() && this.getAccessToken()));

  constructor(private readonly http: HttpClient) {}

  login(username: string, password: string) {
    return this.http
      .post<LoginResponse>(`${API_BASE_URL}/auth/login/`, { username, password })
      .pipe(tap((response) => this.storeSession(response)));
  }

  loadCurrentUser() {
    return this.http
      .get<AuthUser>(`${API_BASE_URL}/auth/me/`)
      .pipe(tap((user) => this.storeUser(user)));
  }

  logout(): void {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    this.currentUserSignal.set(null);
  }

  getAccessToken(): string | null {
    return localStorage.getItem(ACCESS_TOKEN_KEY);
  }

  getRedirectPath(role: UserRole | undefined): string {
    if (!role) {
      return '/panel';
    }

    return '/panel';
  }

  private storeSession(response: LoginResponse): void {
    localStorage.setItem(ACCESS_TOKEN_KEY, response.access);
    localStorage.setItem(REFRESH_TOKEN_KEY, response.refresh);
    this.storeUser(response.user);
  }

  private storeUser(user: AuthUser): void {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    this.currentUserSignal.set(user);
  }

  private getStoredUser(): AuthUser | null {
    const storedUser = localStorage.getItem(USER_KEY);

    if (!storedUser) {
      return null;
    }

    try {
      return JSON.parse(storedUser) as AuthUser;
    } catch {
      localStorage.removeItem(USER_KEY);
      return null;
    }
  }
}