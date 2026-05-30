import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { User } from '../interfaces/User';
import { API_BASE_URL } from '../core/api/api.config';

@Injectable({
  providedIn: 'root',
})
export class UserService {
  isAdmin() {
    throw new Error('Method not implemented.');
  }
  constructor(private http: HttpClient) {}

  // Obtener todos los usuarios
  public getUsers(): Observable<User[]> {
    return this.http.get<User[]>(`${API_BASE_URL}/users/`);
  }

  // Obtener un usuario por id
  public getUserById(id: number): Observable<User[]> {
    return this.http.get<User[]>(`${API_BASE_URL}/users/${id}/`);
  }

  // Crear un nuevo usuario
  public createUser(user: User): Observable<User> {
    return this.http.post<User>(`${API_BASE_URL}/users/`, user);
  }

  // Actualizar un usuario existente
  public updateUser(id: number, user: Partial<User>): Observable<User> {
    return this.http.patch<User>(`${API_BASE_URL}/users/${id}/`, user);
  }

  // Eliminar un usuario
  public deleteUser(id: number): Observable<void> {
    return this.http.delete<void>(`${API_BASE_URL}/users/${id}/`);
  }
}
