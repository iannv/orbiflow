import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { User } from '../interfaces/User';

@Injectable({
  providedIn: 'root',
})
export class UserService {
  url: string = 'http://localhost:8000/api/users/';

  constructor(private http: HttpClient) {}

  public getUsers(): Observable<User[]> {
    return this.http.get<User[]>(this.url);
  }
}
