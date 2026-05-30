export type UserRole = 'admin' | 'treasurer' | 'associate';

export interface AuthUser {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  role: UserRole;
  is_coop_member: boolean;
}

export interface LoginResponse {
  access: string;
  refresh: string;
  user: AuthUser;
}
