import { RolEnum } from '../enums/rolEnum';

export interface User {
  id: number;
  password: string;
  last_login: Date;
  username: string;
  is_superuser: boolean;
  first_name: string;
  last_name: string;
  is_staff: boolean;
  is_active: boolean;
  date_joined: Date;
  role: RolEnum;
  email: string;
  is_deleted: boolean;

  chipName: string;
  chipColorName: string;
  chipBackgroundColor: string;
}
